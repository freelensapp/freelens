/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./list.scss";

import { Spinner } from "@freelensapp/spinner";
import { array, cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { AnsiUp } from "ansi_up";
import autoBindReact from "auto-bind/react";
import DOMPurify from "dompurify";
import { debounce } from "es-toolkit/compat";
import { action, makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import moment from "moment-timezone";
import React from "react";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";
import { SearchStore } from "../../../search-store/search-store";
import { VirtualList } from "../../virtual-list";
import { ToBottom } from "./to-bottom";

import type { ForwardedRef } from "react";
import type { Align } from "react-window";

import type { UserPreferencesState } from "../../../../features/user-preferences/common/state.injectable";
import type { VirtualListRef } from "../../virtual-list";
import type { LogTabViewModel } from "../logs/logs-view-model";

export interface LogListProps {
  model: LogTabViewModel;
}

const colorConverter = new AnsiUp();
const ansiEscapeSequenceRegex =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

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
  private readonly disposers: (() => void)[] = [];
  @observable isJumpButtonVisible = false;
  @observable isLastLineVisible = true;
  @observable.ref private containerWidth = 0;
  @observable private overlapVersion = 0;

  // mobx-react 9 forbids reading this.props inside a derivation. getLogRow is
  // invoked from the VirtualList row renderer (a derivation other than this
  // component's own render), so it — and the logs/showWordWrap getters it calls —
  // read props from this observable snapshot, refreshed on every update, instead
  // of this.props.
  @observable.ref private observableProps: Readonly<
    Dependencies & LogListProps & { innerRef: ForwardedRef<LogListRef> }
  >;

  private virtualListDivElement: HTMLDivElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private virtualListRef = React.createRef<VirtualListRef>(); // A reference for VirtualList component
  private measuredRowHeights = new Map<number, number>();
  private pendingResetFromIndex: number | null = null;
  private pendingResetFrame: number | null = null;
  private lineHeight = 18;
  private charWidth = 7.2;
  private rowPadding = 32;
  private rowVerticalPadding = 4;
  private wrappedRowSafetyPadding = 1;

  private flushMeasuredRowReset = () => {
    this.pendingResetFrame = null;

    if (this.pendingResetFromIndex === null) {
      return;
    }

    this.virtualListRef.current?.resetAfterIndex(this.pendingResetFromIndex);
    this.pendingResetFromIndex = null;
  };

  private scheduleMeasuredRowReset(index: number) {
    this.pendingResetFromIndex =
      this.pendingResetFromIndex === null ? index : Math.min(this.pendingResetFromIndex, index);

    if (this.pendingResetFrame === null) {
      this.pendingResetFrame = window.requestAnimationFrame(this.flushMeasuredRowReset);
    }
  }

  @action
  private updateContainerMetrics() {
    if (!this.virtualListDivElement) {
      return;
    }

    const prevWidth = this.containerWidth;

    this.measureCharMetrics();
    this.containerWidth = this.virtualListDivElement.clientWidth;

    if (prevWidth !== this.containerWidth) {
      this.measuredRowHeights.clear();
      this.overlapVersion++;
      this.virtualListRef.current?.resetAfterIndex(0);
    }
  }

  private virtualListDiv = (el: HTMLDivElement | null) => {
    this.resizeObserver?.disconnect();
    this.virtualListDivElement = el;

    if (el) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateContainerMetrics();
      });
      this.resizeObserver.observe(el);
      this.updateContainerMetrics();
    } else {
      this.resizeObserver = null;
    }
  };

  constructor(props: any) {
    super(props);
    this.observableProps = props;
    makeObservable(this);
    autoBindReact(this);
  }

  componentDidMount() {
    this.updateContainerMetrics();
    window.addEventListener("resize", this.updateContainerMetrics);
    // Capture the model before wiring reactions: mobx-react 9 forbids reading
    // this.props inside a derivation (the reaction data functions below).
    const { model } = this.props;

    this.disposers.push(
      reaction(
        () => model.logs.get(),
        (logs, prevLogs) => {
          const didLogsResetOrPrepend =
            !prevLogs.length || !logs.length || logs[0] !== prevLogs[0] || logs.length < prevLogs.length;

          if (didLogsResetOrPrepend) {
            this.measuredRowHeights.clear();
            this.overlapVersion++;
          }

          this.onLogsInitialLoad(logs, prevLogs);
          this.onLogsUpdate();
          this.onUserScrolledUp(logs, prevLogs);
        },
      ),
      reaction(
        () => model.logTabData.get()?.showTimestamps,
        () => {
          this.measuredRowHeights.clear();
          this.overlapVersion++;
          this.virtualListRef.current?.resetAfterIndex(0);
        },
      ),
    );
    this.bindInnerRef({
      scrollToItem: this.scrollToItem,
    });
  }

  private measureCharMetrics() {
    if (!this.virtualListDivElement) {
      return;
    }

    const probe = document.createElement("span");
    const probeCharacterCount = 10;

    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.fontFamily = "var(--font-monospace)";
    probe.style.fontSize = "smaller";
    probe.style.whiteSpace = "pre";
    probe.textContent = "M".repeat(probeCharacterCount);

    this.virtualListDivElement.appendChild(probe);

    const probeWidth = probe.getBoundingClientRect().width;
    const probeHeight = probe.getBoundingClientRect().height;

    this.charWidth = probeWidth > 0 ? probeWidth / probeCharacterCount : this.charWidth;
    this.lineHeight = probeHeight > 0 ? probeHeight : this.lineHeight;

    this.virtualListDivElement.removeChild(probe);
  }

  componentDidUpdate() {
    this.observableProps = this.props;
    this.bindInnerRef({
      scrollToItem: this.scrollToItem,
    });
  }

  componentWillUnmount() {
    this.measuredRowHeights.clear();
    this.overlapVersion++;
    if (this.pendingResetFrame !== null) {
      window.cancelAnimationFrame(this.pendingResetFrame);
      this.pendingResetFrame = null;
    }
    this.pendingResetFromIndex = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.updateContainerMetrics);
    this.bindInnerRef(null);
    this.disposers.forEach((dispose) => dispose());
  }

  private onRowRendered = (rowIndex: number) => (element: HTMLDivElement | null) => {
    if (!element || !this.showWordWrap) {
      return;
    }

    // `element` is the row's inner content wrapper, which lays out in normal flow and
    // therefore reflects the natural height of the wrapped text. The outer `.LogRow`
    // cannot be measured for this: react-window pins its inline `height` to the current
    // item size, so its bounding box always equals the estimate being verified. Adding
    // the row's vertical padding yields the border-box height the row needs.
    const contentHeight = element.getBoundingClientRect().height;

    if (contentHeight <= 0) {
      return;
    }

    const measuredHeight = Math.ceil(contentHeight) + this.rowVerticalPadding;
    const currentHeight = this.measuredRowHeights.get(rowIndex);

    if (currentHeight === measuredHeight) {
      return;
    }

    this.measuredRowHeights.set(rowIndex, measuredHeight);
    this.overlapVersion++;
    this.scheduleMeasuredRowReset(rowIndex);
  };

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
   *
   * Plain getter (not @computed): reads props, which mobx-react 9 forbids inside
   * a derivation. Reads from the observable snapshot so it is safe both from
   * render and from the VirtualList row renderer (getLogRow).
   */
  get logs(): string[] {
    const { model, state } = this.observableProps;
    const { showTimestamps } = model.logTabData.get() ?? {};

    if (!showTimestamps) {
      return model.logsWithoutTimestamps.get();
    }

    return model.timestampSplitLogs
      .get()
      .map(([logTimestamp, log]) => `${logTimestamp && moment.tz(logTimestamp, state.localeTimezone).format()}${log}`);
  }

  get showWordWrap(): boolean {
    return this.observableProps.model.logTabData.get()?.showWordWrap ?? false;
  }

  getRowHeights(): number[] {
    this.overlapVersion;

    if (!this.showWordWrap || !this.containerWidth) {
      return array.filled(this.logs.length, this.lineHeight + this.rowVerticalPadding);
    }

    const usableWidth = Math.max(this.containerWidth - this.rowPadding, 1);
    const charsPerLine = Math.max(1, Math.floor(usableWidth / this.charWidth));

    return this.logs.map((line, rowIndex) => {
      // Prefer the real rendered height once the row has been measured; the estimate
      // below is only a first approximation used until the row is laid out.
      const measuredHeight = this.measuredRowHeights.get(rowIndex);

      if (measuredHeight !== undefined) {
        return measuredHeight;
      }

      const visibleLine = line.replace(ansiEscapeSequenceRegex, "");
      const lineCount = visibleLine.split("\n").reduce((count, segment) => {
        const wrappedLineCount = Math.max(1, Math.ceil(segment.length / charsPerLine));

        return count + wrappedLineCount;
      }, 0);

      return lineCount * this.lineHeight + this.rowVerticalPadding + this.wrappedRowSafetyPadding;
    });
  }

  /**
   * Checks if JumpToBottom button should be visible and sets its observable.
   * react-window v2 scrolls the list's outermost element natively, so the
   * scroll position is read from that element instead of a scrollOffset payload.
   */
  setButtonVisibility = action(() => {
    const el = this.virtualListDivElement;

    if (!el) return;

    const offset = 100 * this.lineHeight;

    if (el.scrollHeight - el.scrollTop < offset) {
      this.isJumpButtonVisible = false;
    } else {
      this.isJumpButtonVisible = true;
    }
  });

  /**
   * Checks if last log line considered visible to user, setting its observable
   */
  setLastLineVisibility = action(() => {
    const el = this.virtualListDivElement;

    if (!el) return;
    this.isLastLineVisible = el.clientHeight + el.scrollTop === el.scrollHeight;
  });

  /**
   * Check if user scrolled to top and new logs should be loaded
   */
  checkLoadIntent = () => {
    const el = this.virtualListDivElement;

    if (el && el.scrollTop === 0) {
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

  onScroll = () => {
    this.isLastLineVisible = false;
    this.onScrollDebounced();
  };

  onScrollDebounced = debounce(() => {
    if (this.virtualListDivElement) {
      this.setButtonVisibility();
      this.setLastLineVisibility();
      this.checkLoadIntent();
    }
  }, 700); // Increasing performance and giving some time for virtual list to settle down

  /**
   * A function is called by VirtualList for rendering each of the row
   * @param rowIndex index of the log element in logs array
   * @returns A react element with a row itself
   */
  getLogRow = (rowIndex: number) => {
    const { searchQuery, isActiveOverlay } = this.observableProps.model.searchStore;
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
        <div ref={this.onRowRendered(rowIndex)}>
          {contents.length > 1 ? contents : <span dangerouslySetInnerHTML={{ __html: ansiToHtml(item) }} />}
          {/* For preserving copy-paste experience and keeping line breaks */}
          <br />
        </div>
      </div>
    );
  };

  render() {
    if (this.props.model.isLoading.get()) {
      return (
        <div className="LogList flex grow shrink-0 basis-0 items-center justify-center">
          <Spinner />
        </div>
      );
    }

    if (!this.logs.length) {
      return (
        <div className="LogList flex grow shrink-0 basis-0 items-center justify-center">
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
          className="grow shrink-0 basis-0"
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

export const LogList = ({ ref, ...props }: LogListProps & { ref?: ForwardedRef<LogListRef> }) => (
  <InjectedNonForwardedLogList {...props} innerRef={ref ?? null} />
);
