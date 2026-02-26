/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { SearchStore } from "../../../../search-store/search-store";
import { renderFor } from "../../../test-utils/renderFor";
import { LogControls } from "../controls";
import { LogTabViewModel } from "../logs-view-model";
import { dockerPod } from "./pod.mock";

import type { UserEvent } from "@testing-library/user-event";

import type { DiRender } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";
import type { LogTabViewModelDependencies } from "../logs-view-model";

function mockLogTabViewModel(tabId: TabId, deps: Partial<LogTabViewModelDependencies>): LogTabViewModel {
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
    ...deps,
  });
}

function getOnePodViewModel(
  tabId: TabId,
  showWordWrap: boolean,
  deps: Partial<LogTabViewModelDependencies> = {},
): LogTabViewModel {
  const selectedPod = dockerPod;

  return mockLogTabViewModel(tabId, {
    getLogTabData: () => ({
      selectedPodId: selectedPod.getId(),
      selectedContainer: selectedPod.getContainers()[0].name,
      namespace: selectedPod.getNs(),
      showPrevious: false,
      showTimestamps: false,
      showWordWrap,
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

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    user = userEvent.setup();
  });

  it("enables word wrap when it is currently disabled", async () => {
    const model = getOnePodViewModel("foobar", false);
    const updateLogTabDataSpy = jest.spyOn(model, "updateLogTabData");

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Word wrap"));

    expect(updateLogTabDataSpy).toHaveBeenCalledWith({ showWordWrap: true });
  });

  it("disables word wrap when it is currently enabled", async () => {
    const model = getOnePodViewModel("foobar", true);
    const updateLogTabDataSpy = jest.spyOn(model, "updateLogTabData");

    render(<LogControls model={model} />);

    await user.click(await screen.findByText("Word wrap"));

    expect(updateLogTabDataSpy).toHaveBeenCalledWith({ showWordWrap: false });
  });
});
