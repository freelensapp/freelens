/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./list.scss";

import { Spinner } from "@freelensapp/spinner";
import { array, cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import AnsiUp from "ansi_up";
import autoBindReact from "auto-bind/react";
import DOMPurify from "dompurify";
import debounce from "lodash/debounce";
import { action, computed, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import moment from "moment-timezone";
import React from "react";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";
import { SearchStore } from "../../../search-store/search-store";
import { VirtualList } from "../../virtual-list";
import { ToBottom } from "./to-bottom";

import type { ForwardedRef } from "react";
import type { Align, ListOnScrollProps } from "react-window";

import type { UserPreferencesState } from "../../../../features/user-preferences/common/state.injectable";
import type { VirtualListRef } from "../../virtual-list";
import type { LogTabViewModel } from "../logs/logs-view-model";

export interface LogListProps {
  model: LogTabViewModel;
}

const colorConverter = new AnsiUp();

export interface LogListRef {
  scrollToItem: (index: number, align: Align) => void;
}

interface Dependencies {
  state: UserPreferencesState;
}

@observer
class NonForwardedLogList extends React.Component<
  Dependencies & LogListProps & { innerRef: ForwardedRef<LogListRef> }
> {
  @observable isJumpButtonVisible = false;
  @observable isLastLineVisible = true;
  @observable.ref private containerWidth = 0;

  private virtualListDivElement: HTMLDivElement | null = null;
  private virtualListRef = React.createRef<VirtualListRef>(); // A reference for VirtualList component
  private lineHeight = 18;
  private charWidth = 7.2;
  private rowPadding = 32;

  private virtualListDiv = (el: HTMLDivElement | null) => {
    this.virtualListDivElement = el;

    if (el) {
      this.containerWidth = el.clientWidth;
    }
  };

  constructor(props: any) {
    super(props);
    makeObservable(this);
    autoBindReact(this);
  }

  componentDidMount() {
    this.measureCharMetrics();
    disposeOnUnmount(this, [
      reaction(
        () => this.props.model.logs.get(),
        (logs, prevLogs) => {
          this.onLogsInitialLoad(logs, prevLogs);
          this.onLogsUpdate();
          this.onUserScrolledUp(logs, prevLogs);
        },
      ),
    ]);
    this.bindInnerRef({
      scrollToItem: this.scrollToItem,
    });
  }

  private measureCharMetrics() {
    const probe = document.createElement("span");

    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.fontFamily = "var(--font-monospace)";
    probe.style.fontSize = "smaller";
    probe.style.whiteSpace = "pre";
    probe.textContent = "X";
    document.body.appendChild(probe);
    this.charWidth = probe.offsetWidth || this.charWidth;
    this.lineHeight = probe.offsetHeight || this.lineHeight;
    document.body.removeChild(probe);
  }

  componentDidUpdate() {
    this.bindInnerRef({
      scrollToItem: this.scrollToItem,
    });
  }

  componentWillUnmount() {
    this.bindInnerRef(null);
  }

  private bindInnerRef(value: LogListRef | null) {
    if (typeof this.props.innerRef === "function") {
      this.props.innerRef(value);
    } else if (this.props.innerRef && typeof this.props.innerRef === "object") {
      this.props.innerRef.current = value;
    }
  }

  onLogsInitialLoad(logs: string[], prevLogs: string[]) {
    if (!prevLogs.length && logs.length) {
      this.isLastLineVisible = true;
    }
  }

  onLogsUpdate() {
    if (this.isLastLineVisible) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 500); // Giving some time to VirtualList to prepare its outerRef (this.virtualListDiv) element
    }
  }

  onUserScrolledUp(logs: string[], prevLogs: string[]) {
    if (!this.virtualListDivElement) return;

    const newLogsAdded = prevLogs.length < logs.length;
    const scrolledToBeginning = this.virtualListDivElement.scrollTop === 0;

    if (newLogsAdded && scrolledToBeginning) {
      const firstLineContents = prevLogs[0];
      const lineToScroll = logs.findIndex((value) => value == firstLineContents);

      if (lineToScroll !== -1) {
        this.scrollToItem(lineToScroll, "start");
      }
    }
  }

  /**
   * Returns logs with or without timestamps regarding to showTimestamps prop
   */
  @computed
  get logs(): string[] {
    const { showTimestamps } = this.props.model.logTabData.get() ?? {};

    if (!showTimestamps) {
      return this.props.model.logsWithoutTimestamps.get();
    }

    return this.props.model.timestampSplitLogs
      .get()
      .map(
        ([logTimestamp, log]) =>
          `${logTimestamp && moment.tz(logTimestamp, this.props.state.localeTimezone).format()}${log}`,
      );
  }

  get showWordWrap(): boolean {
    return this.props.model.logTabData.get()?.showWordWrap ?? false;
  }

  getRowHeights(): number[] {
    if (!this.showWordWrap || !this.containerWidth) {
      return array.filled(this.logs.length, this.lineHeight);
    }

    const usableWidth = Math.max(this.containerWidth - this.rowPadding, 1);
    const charsPerLine = Math.floor(usableWidth / this.charWidth);

    return this.logs.map((line) => {
      const lineCount = Math.max(1, Math.ceil(line.length / charsPerLine));

      return lineCount * this.lineHeight;
    });
  }

  /**
   * Checks if JumpToBottom button should be visible and sets its observable
   * @param props Scrolling props from virtual list core
   */
  setButtonVisibility = action(({ scrollOffset }: ListOnScrollProps) => {
    const el = this.virtualListDivElement;

    if (!el) return;

    const offset = 100 * this.lineHeight;

    if (el.scrollHeight - scrollOffset < offset) {
      this.isJumpButtonVisible = false;
    } else {
      this.isJumpButtonVisible = true;
    }
  });

  /**
   * Checks if last log line considered visible to user, setting its observable
   * @param props Scrolling props from virtual list core
   */
  setLastLineVisibility = action(({ scrollOffset }: ListOnScrollProps) => {
    const el = this.virtualListDivElement;

    if (!el) return;
    this.isLastLineVisible = el.clientHeight + scrollOffset === el.scrollHeight;
  });

  /**
   * Check if user scrolled to top and new logs should be loaded
   * @param props Scrolling props from virtual list core
   */
  checkLoadIntent = (props: ListOnScrollProps) => {
    const { scrollOffset } = props;

    if (scrollOffset === 0) {
      this.props.model.loadLogs();
    }
  };

  scrollToBottom = () => {
    if (this.logs.length) {
      this.scrollToItem(this.logs.length - 1, "end");
    }
  };

  scrollToItem = (index: number, align: Align) => {
    this.virtualListRef.current?.scrollToItem(index, align);
  };

  onScroll = (props: ListOnScrollProps) => {
    this.isLastLineVisible = false;
    this.onScrollDebounced(props);
  };

  onScrollDebounced = debounce((props: ListOnScrollProps) => {
    if (this.virtualListDivElement) {
      this.setButtonVisibility(props);
      this.setLastLineVisibility(props);
      this.checkLoadIntent(props);
    }
  }, 700); // Increasing performance and giving some time for virtual list to settle down

  /**
   * A function is called by VirtualList for rendering each of the row
   * @param rowIndex index of the log element in logs array
   * @returns A react element with a row itself
   */
  getLogRow = (rowIndex: number) => {
    const { searchQuery, isActiveOverlay } = this.props.model.searchStore;
    const item = this.logs[rowIndex];
    const contents: React.ReactElement[] = [];
    const ansiToHtml = (ansi: string) => DOMPurify.sanitize(colorConverter.ansi_to_html(ansi));

    if (searchQuery) {
      // If search is enabled, replace keyword with backgrounded <span>
      // Case-insensitive search (lowercasing query and keywords in line)
      const regex = new RegExp(SearchStore.escapeRegex(searchQuery), "gi");
      const matches = item.matchAll(regex);
      const modified = item.replace(regex, (match) => match.toLowerCase());
      // Splitting text line by keyword
      const pieces = modified.split(searchQuery.toLowerCase());

      pieces.forEach((piece, index) => {
        const active = isActiveOverlay(rowIndex, index);
        const lastItem = index === pieces.length - 1;
        const overlayValueString = matches.next().value?.[0] ?? "";
        const overlay = !lastItem ? (
          <span
            className={cssNames("overlay", { active })}
            dangerouslySetInnerHTML={{ __html: ansiToHtml(overlayValueString) }}
          />
        ) : null;

        contents.push(
          <React.Fragment key={piece + index}>
            <span dangerouslySetInnerHTML={{ __html: ansiToHtml(piece) }} />
            {overlay}
          </React.Fragment>,
        );
      });
    }

    return (
      <div className={cssNames("LogRow", { wordWrap: this.showWordWrap })}>
        {contents.length > 1 ? contents : <span dangerouslySetInnerHTML={{ __html: ansiToHtml(item) }} />}
        {/* For preserving copy-paste experience and keeping line breaks */}
        <br />
      </div>
    );
  };

  render() {
    if (this.props.model.isLoading.get()) {
      return (
        <div className="LogList flex box grow align-center justify-center">
          <Spinner />
        </div>
      );
    }

    if (!this.logs.length) {
      return (
        <div className="LogList flex box grow align-center justify-center">
          There are no logs available for container {this.props.model.logTabData.get()?.selectedContainer}
        </div>
      );
    }

    return (
      <div className={cssNames("LogList flex")}>
        <VirtualList
          items={this.logs}
          rowHeights={this.getRowHeights()}
          getRow={this.getLogRow}
          onScroll={this.onScroll}
          outerRef={this.virtualListDiv}
          ref={this.virtualListRef}
          className="box grow"
        />
        {this.isJumpButtonVisible && <ToBottom onClick={this.scrollToBottom} />}
      </div>
    );
  }
}

const InjectedNonForwardedLogList = withInjectables<
  Dependencies,
  LogListProps & { innerRef: ForwardedRef<LogListRef> }
>(NonForwardedLogList, {
  getProps: (di, props) => ({
    ...props,
    state: di.inject(userPreferencesStateInjectable),
  }),
});

export const LogList = React.forwardRef<LogListRef, LogListProps>((props, ref) => (
  <InjectedNonForwardedLogList {...props} innerRef={ref} />
));
