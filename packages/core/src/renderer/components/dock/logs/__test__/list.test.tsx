/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";
import React from "react";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { SearchStore } from "../../../../search-store/search-store";
import { renderFor } from "../../../test-utils/renderFor";
import { LogList } from "../list";
import { LogTabViewModel } from "../logs-view-model";
import { dockerPod } from "./pod.mock";

import type { DiRender } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";
import type { LogTabViewModelDependencies } from "../logs-view-model";

const virtualListMock = jest.fn();

jest.mock("../../../virtual-list", () => {
  const React = require("react");

  return {
    VirtualList: (props: any) => {
      virtualListMock(props);

      return <div data-testid="virtual-list">{props.getRow(0)}</div>;
    },
  };
});

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
    areLogsPresent: jest.fn(() => false),
    searchStore: new SearchStore(),
    downloadLogs: jest.fn(),
    downloadAllLogs: jest.fn(),
    ...deps,
  });
}

function getOnePodViewModel(tabId: TabId, showWordWrap: boolean): LogTabViewModel {
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

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    virtualListMock.mockClear();
  });

  it("does not add wordWrap class when showWordWrap is disabled", () => {
    const model = getOnePodViewModel("foobar", false);
    const { container } = render(<LogList model={model} />);

    expect(container.querySelector(".LogRow.wordWrap")).not.toBeInTheDocument();
  });

  it("adds wordWrap class when showWordWrap is enabled", () => {
    const model = getOnePodViewModel("foobar", true);
    const { container } = render(<LogList model={model} />);

    expect(container.querySelector(".LogRow.wordWrap")).toBeInTheDocument();
  });
});
