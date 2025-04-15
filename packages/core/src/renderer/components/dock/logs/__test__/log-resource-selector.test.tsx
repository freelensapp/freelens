/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import "@testing-library/jest-dom";
import assert from "assert";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import * as selectEvent from "react-select-event";
import directoryForUserDataInjectable from "../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fsInjectable from "../../../../../common/fs/fs.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { SearchStore } from "../../../../search-store/search-store";
import type { DiRender } from "../../../test-utils/renderFor";
import { renderFor } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";
import callForLogsInjectable from "../call-for-logs.injectable";
import type { LogTabViewModelDependencies } from "../logs-view-model";
import { LogTabViewModel } from "../logs-view-model";
import { LogResourceSelector } from "../resource-selector";
import { deploymentPod1, deploymentPod2, dockerPod } from "./pod.mock";

function mockLogTabViewModel(tabId: TabId, deps: Partial<LogTabViewModelDependencies>): LogTabViewModel {
  return new LogTabViewModel(tabId, {
    getLogs: jest.fn(),
    getLogsWithoutTimestamps: jest.fn(),
    getTimestampSplitLogs: jest.fn(),
    getLogTabData: jest.fn(),
    setLogTabData: jest.fn(),
    loadLogs: jest.fn(),
    reloadLogs: jest.fn(),
    renameTab: jest.fn(),
    stopLoadingLogs: jest.fn(),
    getPodById: jest.fn(),
    getPodsByOwnerId: jest.fn(),
    searchStore: new SearchStore(),
    areLogsPresent: jest.fn(),
    downloadLogs: jest.fn(),
    downloadAllLogs: jest.fn(),
    ...deps,
  });
}

function getOnePodViewModel(tabId: TabId, deps: Partial<LogTabViewModelDependencies> = {}): LogTabViewModel {
  const selectedPod = dockerPod;

  return mockLogTabViewModel(tabId, {
    getLogTabData: () => ({
      selectedPodId: selectedPod.getId(),
      selectedContainer: selectedPod.getContainers()[0].name,
      namespace: selectedPod.getNs(),
      showPrevious: false,
      showTimestamps: false,
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

const getFewPodsTabData = (tabId: TabId, deps: Partial<LogTabViewModelDependencies> = {}): LogTabViewModel => {
  const selectedPod = deploymentPod1;
  const anotherPod = deploymentPod2;

  return mockLogTabViewModel(tabId, {
    getLogTabData: () => ({
      owner: {
        uid: "uuid",
        kind: "Deployment",
        name: "super-deployment",
      },
      selectedPodId: selectedPod.getId(),
      selectedContainer: selectedPod.getContainers()[0].name,
      namespace: selectedPod.getNs(),
      showPrevious: false,
      showTimestamps: false,
    }),
    getPodById: (id) => {
      if (id === selectedPod.getId()) {
        return selectedPod;
      }

      if (id === anotherPod.getId()) {
        return anotherPod;
      }

      return undefined;
    },
    getPodsByOwnerId: (id) => {
      if (id === "uuid") {
        return [selectedPod, anotherPod];
      }

      return [];
    },
    ...deps,
  });
};

describe("<LogResourceSelector />", () => {
  let render: DiRender;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    const { ensureDirSync } = di.inject(fsInjectable);

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(callForLogsInjectable, () => () => Promise.resolve("some-logs"));

    render = renderFor(di);

    ensureDirSync("/tmp");

    user = userEvent.setup();
  });

  describe("with one pod", () => {
    let model: LogTabViewModel;

    beforeEach(() => {
      model = getOnePodViewModel("foobar");
    });

    it("renders w/o errors", () => {
      const { container } = render(<LogResourceSelector model={model} />);

      expect(container).toBeInstanceOf(HTMLElement);
    });

    it("renders proper namespace", async () => {
      const { findByTestId } = render(<LogResourceSelector model={model} />);
      const ns = await findByTestId("namespace-badge");

      expect(ns).toHaveTextContent("default");
    });

    it("renders proper selected items within dropdowns", async () => {
      const { findByText } = render(<LogResourceSelector model={model} />);

      expect(await findByText("dockerExporter")).toBeInTheDocument();
      expect(await findByText("docker-exporter")).toBeInTheDocument();
    });
  });

  describe("with several pods", () => {
    let model: LogTabViewModel;
    let renameTab: jest.MockedFunction<LogTabViewModelDependencies["renameTab"]>;

    beforeEach(() => {
      renameTab = jest.fn();
      model = getFewPodsTabData("foobar", { renameTab });
    });

    it("renders sibling pods in dropdown", async () => {
      const { container, findByText } = render(<LogResourceSelector model={model} />);
      const selector = container.querySelector<HTMLElement>(".pod-selector");

      assert(selector);

      selectEvent.openMenu(selector);
      expect(
        await findByText("deploymentPod2", { selector: ".pod-selector-menu .Select__option" }),
      ).toBeInTheDocument();
      expect(
        await findByText("deploymentPod1", { selector: ".pod-selector-menu .Select__option" }),
      ).toBeInTheDocument();
    });

    it("renders sibling containers in dropdown", async () => {
      const { findByText, container } = render(<LogResourceSelector model={model} />);
      const selector = container.querySelector<HTMLElement>(".container-selector");

      assert(selector);

      selectEvent.openMenu(selector);

      expect(await findByText("node-exporter-1")).toBeInTheDocument();
      expect(await findByText("init-node-exporter")).toBeInTheDocument();
      expect(await findByText("init-node-exporter-1")).toBeInTheDocument();
    });

    it("renders pod owner as badge", async () => {
      const { findByText } = render(<LogResourceSelector model={model} />);

      expect(
        await findByText("super-deployment", {
          exact: false,
        }),
      ).toBeInTheDocument();
    });

    it("updates tab name if selected pod changes", async () => {
      const { findByText, container } = render(<LogResourceSelector model={model} />);
      const selector = container.querySelector<HTMLElement>(".pod-selector");

      assert(selector);

      selectEvent.openMenu(selector);
      await user.click(await findByText("deploymentPod2", { selector: ".pod-selector-menu .Select__option" }));
      expect(renameTab).toBeCalledWith("foobar", "Pod deploymentPod2");
    });
  });
});
