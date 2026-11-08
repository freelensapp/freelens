/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForLensLocalStorageInjectable from "../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import hostedClusterIdInjectable from "../../renderer/cluster-frame-context/hosted-cluster-id.injectable";
import dockStoreInjectable from "../../renderer/components/dock/dock/store.injectable";
import { dockerPod } from "../../renderer/components/dock/logs/__test__/pod.mock";
import areLogsPresentInjectable from "../../renderer/components/dock/logs/are-logs-present.injectable";
import callForLogsInjectable from "../../renderer/components/dock/logs/call-for-logs.injectable";
import createPodLogsTabInjectable from "../../renderer/components/dock/logs/create-pod-logs-tab.injectable";
import getLogsWithoutTimestampsInjectable from "../../renderer/components/dock/logs/get-logs-without-timestamps.injectable";
import getLogsInjectable from "../../renderer/components/dock/logs/get-logs.injectable";
import getRandomIdForPodLogsTabInjectable from "../../renderer/components/dock/logs/get-random-id-for-pod-logs-tab.injectable";
import getTimestampSplitLogsInjectable from "../../renderer/components/dock/logs/get-timestamp-split-logs.injectable";
import loadLogsInjectable from "../../renderer/components/dock/logs/load-logs.injectable";
import reloadLogsInjectable from "../../renderer/components/dock/logs/reload-logs.injectable";
import setLogTabDataInjectable from "../../renderer/components/dock/logs/set-log-tab-data.injectable";
import stopLoadingLogsInjectable from "../../renderer/components/dock/logs/stop-loading-logs.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import getPodByIdInjectable from "../../renderer/components/workloads-pods/get-pod-by-id.injectable";
import getPodsByOwnerIdInjectable from "../../renderer/components/workloads-pods/get-pods-by-owner-id.injectable";

import type { Container } from "@freelensapp/kube-object";
import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("opening multiple pod logs dock tabs (#2960)", () => {
  let windowDi: DiContainer;
  let rendered: RenderResult;
  let builder: ApplicationBuilder;

  const container: Container = {
    name: "main-container",
    image: "docker.io/library/busybox:latest",
  };

  beforeEach(() => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");
      windowDi.override(hostedClusterIdInjectable, () => "some-cluster-id");
      windowDi.override(callForLogsInjectable, () => vi.fn());
      windowDi.override(getLogsInjectable, () => vi.fn(() => ["log-line"]));
      windowDi.override(getLogsWithoutTimestampsInjectable, () => vi.fn(() => ["log-line"]));
      windowDi.override(getTimestampSplitLogsInjectable, () => vi.fn(() => new Map()));
      windowDi.override(reloadLogsInjectable, () => vi.fn());
      windowDi.override(setLogTabDataInjectable, () => vi.fn());
      windowDi.override(loadLogsInjectable, () => vi.fn());
      windowDi.override(stopLoadingLogsInjectable, () => vi.fn());
      windowDi.override(areLogsPresentInjectable, () => vi.fn(() => true));
      windowDi.override(getPodByIdInjectable, () => () => dockerPod);
      windowDi.override(getPodsByOwnerIdInjectable, () => vi.fn());

      let tabCount = 0;
      windowDi.override(getRandomIdForPodLogsTabInjectable, () => vi.fn(() => `sub-${++tabCount}`));
    });
  });

  it("remounts logs tab view when switching between multiple logs tabs because of key={tab.id}", async () => {
    rendered = await builder.render();
    windowDi = builder.applicationWindow.only.di;

    const dockStore = windowDi.inject(dockStoreInjectable);
    act(() => {
      dockStore.closeTab("terminal");
    });

    const createLogsTab = windowDi.inject(createPodLogsTabInjectable);

    // Open first logs tab
    let firstTabId: string;
    act(() => {
      firstTabId = createLogsTab({
        selectedPod: dockerPod,
        selectedContainer: container,
      });
    });

    expect(dockStore.selectedTabId).toBe(firstTabId!);
    expect(rendered.getByTestId(`dock-tab-content-for-${firstTabId!}`)).toBeInTheDocument();

    // Open second logs tab
    let secondTabId: string;
    act(() => {
      secondTabId = createLogsTab({
        selectedPod: dockerPod,
        selectedContainer: container,
      });
    });

    expect(dockStore.selectedTabId).toBe(secondTabId!);
    expect(rendered.getByTestId(`dock-tab-content-for-${secondTabId!}`)).toBeInTheDocument();
  });
});
