/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { act, waitFor } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import userPreferencesStateInjectable from "../../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import { LogList } from "../list";
import { LogTabViewModel } from "../logs-view-model";
import { dockerPod } from "./pod.mock";
import {
  createMockLogTabViewModel,
  getDefaultOnePodLogTabData,
  initializeDefaultLogViewerPreferences,
} from "./test-utils";

import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";
import type { DiRender } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";

const virtualListMock = vi.fn();
const formatInTimeZoneMock = vi.hoisted(() => vi.fn());

vi.mock("@freelensapp/utilities", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@freelensapp/utilities")>();

  formatInTimeZoneMock.mockImplementation(actual.formatInTimeZone);

  return { ...actual, formatInTimeZone: formatInTimeZoneMock };
});

vi.mock("../../../virtual-list", () => {
  return {
    VirtualList: (props: any) => {
      virtualListMock(props);

      return (
        <div data-testid="virtual-list" ref={props.outerRef}>
          {props.getRow(0)}
        </div>
      );
    },
  };
});

function splitOutTimestamp(line: string): [string, string] {
  const [timestamp] = line.split(" ", 1);

  return [timestamp, line.slice(timestamp.length)];
}

function getOnePodViewModel(
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  showWordWrap: boolean,
): LogTabViewModel {
  const selectedPod = dockerPod;

  return createMockLogTabViewModel(tabId, userPreferencesState, {
    getLogTabData: () => getDefaultOnePodLogTabData({ showWordWrap }),
    getLogsWithoutTimestamps: () => ["Regular log line"],
    getPodById: (id) => {
      if (id === selectedPod.getId()) {
        return selectedPod;
      }

      return undefined;
    },
  });
}

describe("LogList", () => {
  let render: DiRender;
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    virtualListMock.mockClear();
    userPreferencesState = di.inject(userPreferencesStateInjectable);
    initializeDefaultLogViewerPreferences(userPreferencesState);
  });

  it("does not add wordWrap class when showWordWrap is disabled", () => {
    const model = getOnePodViewModel("foobar", userPreferencesState, false);
    const { container } = render(<LogList model={model} />);

    expect(container.querySelector(".LogRow.wordWrap")).not.toBeInTheDocument();
  });

  it("adds wordWrap class when showWordWrap is enabled", () => {
    const model = getOnePodViewModel("foobar", userPreferencesState, true);
    const { container } = render(<LogList model={model} />);

    expect(container.querySelector(".LogRow.wordWrap")).toBeInTheDocument();
  });

  describe("given the timestamps are shown", () => {
    const logs = observable.box<string[]>([], { deep: false });
    let model: LogTabViewModel;

    beforeEach(() => {
      userPreferencesState.localeTimezone = "Asia/Kolkata";
      runInAction(() => {
        logs.set([
          "2026-01-01T00:00:00.000000000Z first line",
          "2026-01-01T00:00:01.000000000Z second line",
          "2026-01-01T00:00:02.000000000Z third line",
        ]);
      });
      model = createMockLogTabViewModel("foobar", userPreferencesState, {
        getLogTabData: () => getDefaultOnePodLogTabData({ showTimestamps: true, showWordWrap: true }),
        getLogs: () => logs.get(),
        getTimestampSplitLogs: () => logs.get().map(splitOutTimestamp),
        getPodById: () => dockerPod,
      });
      formatInTimeZoneMock.mockClear();
    });

    it("shows the timestamps in the time zone of the preferences", () => {
      const { container } = render(<LogList model={model} />);

      expect(container.querySelector(".LogRow")).toHaveTextContent("2026-01-01T05:30:00+05:30 first line");
    });

    it("formats the timestamp of every line once, however many times the list reads the lines", () => {
      render(<LogList model={model} />);

      // One render reads the lines for the items, for the row heights and for
      // every row: none of them may format the timestamps again.
      expect(formatInTimeZoneMock).toHaveBeenCalledTimes(3);
    });

    it("formats the timestamps again when the logs change", () => {
      const { container } = render(<LogList model={model} />);

      act(() => {
        runInAction(() => {
          logs.set(["2026-01-01T00:00:10.000000000Z newer line"]);
        });
      });

      expect(container.querySelector(".LogRow")).toHaveTextContent("2026-01-01T05:30:10+05:30 newer line");
      expect(formatInTimeZoneMock).toHaveBeenCalledTimes(4);
    });

    it("formats the timestamps again when the time zone of the preferences changes", () => {
      const { container } = render(<LogList model={model} />);

      act(() => {
        runInAction(() => {
          userPreferencesState.localeTimezone = "UTC";
        });
      });

      expect(container.querySelector(".LogRow")).toHaveTextContent("2026-01-01T00:00:00Z first line");
      expect(formatInTimeZoneMock).toHaveBeenCalledTimes(6);
    });
  });

  it("reports the measured content height plus the row's vertical padding as the row height", async () => {
    const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 400,
    });

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      height: 36,
      width: 72,
    } as DOMRect);

    try {
      const model = getOnePodViewModel("foobar", userPreferencesState, true);

      render(<LogList model={model} />);

      await waitFor(() => {
        expect(virtualListMock).toHaveBeenLastCalledWith(expect.objectContaining({ rowHeights: [40] }));
      });
    } finally {
      if (originalClientWidth) {
        Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
      } else {
        delete (HTMLElement.prototype as any).clientWidth;
      }

      vi.restoreAllMocks();
    }
  });
});
