/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./search.scss";

import { Icon } from "@freelensapp/icon";
import { observer } from "mobx-react";
import React, { useCallback, useEffect } from "react";
import { SearchInput } from "../../input";

import type { LogTabViewModel } from "./logs-view-model";

const isFindHotkey = (evt: KeyboardEvent) => evt.key.toLowerCase() === "f" && (evt.metaKey || evt.ctrlKey);

const isInsideLogsList = (node: Node | null) => {
  if (!node) {
    return false;
  }

  const element = node instanceof Element ? node : node.parentElement;

  return Boolean(element?.closest(".PodLogs .list, .PodLogs .LogList"));
};

const isSelectionInsideLogsList = (selection: Selection) => {
  const commonAncestor = selection.rangeCount > 0 ? selection.getRangeAt(0).commonAncestorContainer : null;

  return [selection.anchorNode, selection.focusNode, commonAncestor].some(isInsideLogsList);
};

const getSelectedTextFromLogsList = () => {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (!selection || !selectedText) {
    return;
  }

  if (!isSelectionInsideLogsList(selection)) {
    return;
  }

  return selectedText;
};

export interface PodLogSearchProps {
  onSearch?: (query: string) => void;
  scrollToOverlay: (lineNumber: number | undefined) => void;
  model: LogTabViewModel;
}

export const LogSearch = observer(
  ({ onSearch, scrollToOverlay, model: { logTabData, searchStore, ...model } }: PodLogSearchProps) => {
    const tabData = logTabData.get();

    if (!tabData) {
      return null;
    }

    const logs = tabData.showTimestamps ? model.logs.get() : model.logsWithoutTimestamps.get();
    const { setNextOverlayActive, setPrevOverlayActive, searchQuery, occurrences, activeFind, totalFinds } =
      searchStore;
    const jumpDisabled = !searchQuery || !occurrences.length;

    const setSearch = useCallback(
      (query: string) => {
        searchStore.onSearch(logs, query);
        onSearch?.(query);
        scrollToOverlay(searchStore.activeOverlayLine);
      },
      [logs, searchStore, onSearch, scrollToOverlay],
    );

    const onPrevOverlay = () => {
      setPrevOverlayActive();
      scrollToOverlay(searchStore.activeOverlayLine);
    };

    const onNextOverlay = () => {
      setNextOverlayActive();
      scrollToOverlay(searchStore.activeOverlayLine);
    };

    const onClear = () => {
      setSearch("");
    };

    const onKeyDown = (evt: React.KeyboardEvent<any>) => {
      if (evt.key === "Enter") {
        if (evt.shiftKey) {
          onPrevOverlay();
        } else {
          onNextOverlay();
        }
      }
    };

    useEffect(() => {
      // Refresh search when logs changed
      searchStore.onSearch(logs);
    }, [logs]);

    useEffect(() => {
      const onGlobalFind = (evt: KeyboardEvent) => {
        if (!isFindHotkey(evt)) {
          return;
        }

        const selectedText = getSelectedTextFromLogsList();

        if (selectedText) {
          setSearch(selectedText);
        }
      };

      window.addEventListener("keydown", onGlobalFind, true);

      return () => {
        window.removeEventListener("keydown", onGlobalFind, true);
      };
    }, [setSearch]);

    return (
      <div className="LogSearch flex box grow justify-flex-end gaps align-center">
        <SearchInput
          value={searchQuery}
          onChange={setSearch}
          showClearIcon={true}
          contentRight={totalFinds > 0 && <div className="find-count">{`${activeFind} / ${totalFinds}`}</div>}
          onClear={onClear}
          onKeyDown={onKeyDown}
        />
        <Icon material="keyboard_arrow_up" tooltip="Previous" onClick={onPrevOverlay} disabled={jumpDisabled} />
        <Icon material="keyboard_arrow_down" tooltip="Next" onClick={onNextOverlay} disabled={jumpDisabled} />
      </div>
    );
  },
);
