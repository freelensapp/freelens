/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { waitFor } from "@testing-library/react";
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
