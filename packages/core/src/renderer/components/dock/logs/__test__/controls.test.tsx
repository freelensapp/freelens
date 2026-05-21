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
import { SearchStore } from "../../../../search-store/search-store";
import { renderFor } from "../../../test-utils/renderFor";
import { LogControls } from "../controls";
import { LogTabViewModel } from "../logs-view-model";
import { dockerPod } from "./pod.mock";

import type { UserEvent } from "@testing-library/user-event";
import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";
import type { DiRender } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";
import type { LogTabViewModelDependencies } from "../logs-view-model";

function mockLogTabViewModel(
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  deps: Partial<LogTabViewModelDependencies>,
): LogTabViewModel {
  return new LogTabViewModel(tabId, {
    getLogs: jest.fn(),
    getLogsWithoutTimestamps: jest.fn(),
    getTimestampSplitLogs: jest.fn(() => []),
    getLogTabData: jest.fn(),
    setLogTabData: jest.fn(),
    loadLogs: jest.fn(),
    reloadLogs: jest.fn(),
    renameTab: jest.fn(),
    stopLoadingLogs: jest.fn(),
    getPodById: jest.fn(),
    getPodsByOwnerId: jest.fn(),
    areLogsPresent: jest.fn(),
    searchStore: new SearchStore(),
    downloadLogs: jest.fn(),
    downloadAllLogs: jest.fn(),
    userPreferencesState,
    ...deps,
  });
}

function getOnePodViewModel(
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  logViewerPreferences: {
    showTimestamps: boolean;
    showPrevious: boolean;
    showWordWrap: boolean;
  },
  deps: Partial<LogTabViewModelDependencies> = {},
): LogTabViewModel {
  const selectedPod = dockerPod;

  return mockLogTabViewModel(tabId, userPreferencesState, {
    getLogTabData: () => ({
      selectedPodId: selectedPod.getId(),
      selectedContainer: selectedPod.getContainers()[0].name,
      namespace: selectedPod.getNs(),
      ...logViewerPreferences,
    }),
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
    userPreferencesState.logViewerPreferences = {
      showTimestamps: false,
      showPrevious: false,
      showWordWrap: true,
    };
    model = getOnePodViewModel("foobar", userPreferencesState, {
      showTimestamps: false,
      showPrevious: false,
      showWordWrap: true,
    });
  });

  it("toggles timestamps through log viewer preferences", async () => {
    const updateLogPreferencesSpy = jest.fn();

    Object.assign(model as object, {
      updateLogPreferences: updateLogPreferencesSpy,
    });

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Show timestamps"));

    expect(updateLogPreferencesSpy).toHaveBeenCalledWith({ showTimestamps: true });
  });

  it("toggles word wrap through log viewer preferences", async () => {
    const updateLogPreferencesSpy = jest.fn();

    Object.assign(model as object, {
      updateLogPreferences: updateLogPreferencesSpy,
    });

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Word wrap"));

    expect(updateLogPreferencesSpy).toHaveBeenCalledWith({ showWordWrap: false });
  });

  it("toggles previous container through log viewer preferences and reloads logs", async () => {
    const updateLogPreferencesSpy = jest.fn();
    const reloadLogsSpy = jest.spyOn(model, "reloadLogs");

    Object.assign(model as object, {
      updateLogPreferences: updateLogPreferencesSpy,
    });

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Show previous terminated container"));

    expect(updateLogPreferencesSpy).toHaveBeenCalledWith({ showPrevious: true });
    expect(reloadLogsSpy).toHaveBeenCalled();
  });
});
