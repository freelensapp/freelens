/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import userPreferencesStateInjectable from "../../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import { LogControls } from "../controls";
import { LogTabViewModel } from "../logs-view-model";
import { dockerPod } from "./pod.mock";
import {
  createMockLogTabViewModel,
  getDefaultOnePodLogTabData,
  initializeDefaultLogViewerPreferences,
} from "./test-utils";

import type { UserEvent } from "@testing-library/user-event";

import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";
import type { DiRender } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";
import type { LogTabViewModelDependencies } from "../logs-view-model";
import type { LogTabData } from "../tab-store";

function getOnePodViewModel(
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  logTabData: Partial<LogTabData>,
  deps: Partial<LogTabViewModelDependencies> = {},
): LogTabViewModel {
  const selectedPod = dockerPod;

  return createMockLogTabViewModel(tabId, userPreferencesState, {
    getLogTabData: () => getDefaultOnePodLogTabData(logTabData),
    getPodById: (id) => {
      if (id === selectedPod.getId()) {
        return selectedPod;
      }

      return undefined;
    },
    ...deps,
  });
}

describe("LogControls", () => {
  let render: DiRender;
  let user: UserEvent;
  let model: LogTabViewModel;
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    user = userEvent.setup();
    userPreferencesState = di.inject(userPreferencesStateInjectable);
    initializeDefaultLogViewerPreferences(userPreferencesState);
    model = getOnePodViewModel("foobar", userPreferencesState, {
      showTimestamps: false,
      showPrevious: false,
      showWordWrap: true,
    });
  });

  it("updates the saved timestamp preference when toggled", async () => {
    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Show timestamps"));

    expect(userPreferencesState.logViewerPreferences).toEqual({
      showTimestamps: true,
      showWordWrap: true,
    });
  });

  it("updates the saved word wrap preference when toggled", async () => {
    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Word wrap"));

    expect(userPreferencesState.logViewerPreferences).toEqual({
      showTimestamps: false,
      showWordWrap: false,
    });
  });

  it("updates only the tab data (not the saved preference) before reloading logs", async () => {
    const setLogTabData = vi.fn();

    model = getOnePodViewModel(
      "foobar",
      userPreferencesState,
      { showTimestamps: false, showPrevious: false, showWordWrap: true },
      { setLogTabData },
    );

    const reloadLogsSpy = vi.spyOn(model, "reloadLogs");

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Show previous terminated container"));

    expect(setLogTabData).toHaveBeenCalledWith("foobar", expect.objectContaining({ showPrevious: true }));

    // The previous-container choice must not be persisted as a global default.
    expect(userPreferencesState.logViewerPreferences).toEqual({
      showTimestamps: false,
      showWordWrap: true,
    });
    expect(reloadLogsSpy).toHaveBeenCalledTimes(1);
  });
});
