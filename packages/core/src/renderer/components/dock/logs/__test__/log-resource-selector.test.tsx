/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */


import type { MockedFunction } from "vitest";
import "@testing-library/jest-dom/vitest";
import assert from "node:assert";
import userEvent from "@testing-library/user-event";
import * as selectEvent from "react-select-event";
import directoryForUserDataInjectable from "../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fsInjectable from "../../../../../common/fs/fs.injectable";
import userPreferencesStateInjectable from "../../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import callForLogsInjectable from "../call-for-logs.injectable";
import { LogTabViewModel } from "../logs-view-model";
import { LogResourceSelector } from "../resource-selector";
import { deploymentPod1, deploymentPod2, dockerPod } from "./pod.mock";
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

function getOnePodViewModel(
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  deps: Partial<LogTabViewModelDependencies> = {},
): LogTabViewModel {
  const selectedPod = dockerPod;

  return createMockLogTabViewModel(tabId, userPreferencesState, {
    getLogTabData: () => getDefaultOnePodLogTabData(),
    getPodById: (id) => {
      if (id === selectedPod.getId()) {
        return selectedPod;
      }

      return undefined;
    },
    ...deps,
  });
}

const getFewPodsTabData = (
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  deps: Partial<LogTabViewModelDependencies> = {},
): LogTabViewModel => {
  const selectedPod = deploymentPod1;
  const anotherPod = deploymentPod2;

  return createMockLogTabViewModel(tabId, userPreferencesState, {
    getLogTabData: () => ({
      ...getDefaultOnePodLogTabData({
        selectedPodId: selectedPod.getId(),
        selectedContainer: selectedPod.getContainers()[0].name,
        namespace: selectedPod.getNs(),
      }),
      owner: {
        uid: "uuid",
        kind: "Deployment",
        name: "super-deployment",
      },
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
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    const { ensureDirSync } = di.inject(fsInjectable);

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(callForLogsInjectable, () => () => Promise.resolve("some-logs"));

    render = renderFor(di);

    ensureDirSync("/tmp");

    user = userEvent.setup();
    userPreferencesState = di.inject(userPreferencesStateInjectable);
    initializeDefaultLogViewerPreferences(userPreferencesState);
  });

  describe("with one pod", () => {
    let model: LogTabViewModel;

    beforeEach(() => {
      model = getOnePodViewModel("foobar", userPreferencesState);
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
    let renameTab: MockedFunction<LogTabViewModelDependencies["renameTab"]>;

    beforeEach(() => {
      renameTab = vi.fn();
      model = getFewPodsTabData("foobar", userPreferencesState, { renameTab });
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
