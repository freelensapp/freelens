/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
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

import type { LogViewerPreferences } from "../../../../../features/user-preferences/common/preferences-helpers";
import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";
import type { DiRender } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";
import type { LogTabViewModelDependencies } from "../logs-view-model";

function getOnePodViewModel(
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  logViewerPreferences: LogViewerPreferences,
  deps: Partial<LogTabViewModelDependencies> = {},
): LogTabViewModel {
  const selectedPod = dockerPod;

  return createMockLogTabViewModel(tabId, userPreferencesState, {
    getLogTabData: () => getDefaultOnePodLogTabData(logViewerPreferences),
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

  it("toggles timestamps through log viewer preferences", async () => {
    const updateLogPreferencesSpy = jest.spyOn(model, "updateLogPreferences");

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Show timestamps"));

    expect(updateLogPreferencesSpy).toHaveBeenCalledWith({ showTimestamps: true });
  });

  it("toggles word wrap through log viewer preferences", async () => {
    const updateLogPreferencesSpy = jest.spyOn(model, "updateLogPreferences");

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Word wrap"));

    expect(updateLogPreferencesSpy).toHaveBeenCalledWith({ showWordWrap: false });
  });

  it("toggles previous container through log viewer preferences and reloads logs", async () => {
    const updateLogPreferencesSpy = jest.spyOn(model, "updateLogPreferences");
    const reloadLogsSpy = jest.spyOn(model, "reloadLogs");

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Show previous terminated container"));

    expect(updateLogPreferencesSpy).toHaveBeenCalledWith({ showPrevious: true });
    expect(reloadLogsSpy).toHaveBeenCalled();
  });
});
