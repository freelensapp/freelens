/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./search.scss";

import { Icon } from "@freelensapp/icon";
import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchInput } from "../../input";

import type { LogTabViewModel } from "./logs-view-model";

// Keep typing responsive: defer the O(n) regex scan over all log lines until
// the user pauses. 250ms matches the repo's other debounced search inputs.
const SEARCH_DEBOUNCE_MS = 250;

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

    const [inputValue, setInputValue] = useState(searchQuery);
    const inputValueRef = useRef(inputValue);
    inputValueRef.current = inputValue;
    const [searchPending, setSearchPending] = useState(false);

    const jumpDisabled = !inputValue || (!searchPending && !occurrences.length);

    const runSearch = useMemo(
      () =>
        debounce((query: string) => {
          searchStore.onSearch(logs, query);
          scrollToOverlay(searchStore.activeOverlayLine);
          setSearchPending(false);
        }, SEARCH_DEBOUNCE_MS),
      [logs, searchStore, scrollToOverlay],
    );

    useEffect(() => () => runSearch.cancel(), [runSearch]);

    // Sync the local input if the store's query changes externally (e.g. reset).
    useEffect(() => {
      setInputValue(searchQuery);
    }, [searchQuery]);

    const setSearch = useCallback(
      (query: string, options?: { immediate?: boolean }) => {
        setInputValue(query);
        onSearch?.(query);
        setSearchPending(query !== "");
        runSearch(query);
        if (options?.immediate || query === "") {
          runSearch.flush();
        }
      },
      [runSearch, onSearch],
    );

    const onInputChange = useCallback((value: string) => setSearch(value), [setSearch]);

    const onPrevOverlay = () => {
      runSearch.flush();
      setPrevOverlayActive();
      scrollToOverlay(searchStore.activeOverlayLine);
    };

    const onNextOverlay = () => {
      runSearch.flush();
      setNextOverlayActive();
      scrollToOverlay(searchStore.activeOverlayLine);
    };

    const onClear = () => {
      setSearch("");
    };

    const onKeyDown = (evt: React.KeyboardEvent<any>) => {
      if (evt.key === "Enter") {
        runSearch.flush();
        if (evt.shiftKey) {
          onPrevOverlay();
        } else {
          onNextOverlay();
        }
      }
    };

    useEffect(() => {
      // Re-run search when logs stream in; reuse the debounced runner so bursts
      // of incoming lines don't trigger back-to-back full scans.
      if (inputValueRef.current) {
        runSearch(inputValueRef.current);
      }
    }, [logs, runSearch]);

    useEffect(() => {
      const onGlobalFind = (evt: KeyboardEvent) => {
        if (!isFindHotkey(evt)) {
          return;
        }

        const selectedText = getSelectedTextFromLogsList();

        if (selectedText) {
          setSearch(selectedText, { immediate: true });
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
          value={inputValue}
          onChange={onInputChange}
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
