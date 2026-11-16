/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import dockStoreInjectable from "../../renderer/components/dock/dock/store.injectable";
import { dockerPod } from "../../renderer/components/dock/logs/__test__/pod.mock";
import areLogsPresentInjectable from "../../renderer/components/dock/logs/are-logs-present.injectable";
import callForLogsInjectable from "../../renderer/components/dock/logs/call-for-logs.injectable";
import createPodLogsTabInjectable from "../../renderer/components/dock/logs/create-pod-logs-tab.injectable";
import getLogTabDataInjectable from "../../renderer/components/dock/logs/get-log-tab-data.injectable";
import getLogsInjectable from "../../renderer/components/dock/logs/get-logs.injectable";
import getLogsWithoutTimestampsInjectable from "../../renderer/components/dock/logs/get-logs-without-timestamps.injectable";
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

describe("switching between pod logs dock tabs", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let windowDi: DiContainer;

  const container: Container = {
    name: "docker-exporter",
    image: "docker.io/prom/node-exporter:v1.0.0-rc.0",
  };

  beforeEach(async () => {
    let tabs = 0;

    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();
    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(callForLogsInjectable, () => vi.fn());
      windowDi.override(getLogsInjectable, () => () => ["some-logs"]);
      windowDi.override(getLogsWithoutTimestampsInjectable, () => () => ["some-logs"]);
      windowDi.override(getTimestampSplitLogsInjectable, () => () => [["", "some-logs"]]);
      windowDi.override(reloadLogsInjectable, () => vi.fn());
      windowDi.override(getLogTabDataInjectable, () => () => ({
        selectedPodId: dockerPod.getId(),
        selectedContainer: container.name,
        namespace: "default",
        showPrevious: false,
        showTimestamps: false,
        showWordWrap: false,
      }));
      windowDi.override(setLogTabDataInjectable, () => vi.fn());
      windowDi.override(loadLogsInjectable, () => vi.fn());
      windowDi.override(stopLoadingLogsInjectable, () => vi.fn());
      windowDi.override(areLogsPresentInjectable, () => vi.fn());
      windowDi.override(getPodByIdInjectable, () => (id) => (id === dockerPod.getId() ? dockerPod : undefined));
      windowDi.override(getPodsByOwnerIdInjectable, () => vi.fn());
      windowDi.override(getRandomIdForPodLogsTabInjectable, () => () => `tab-${++tabs}`);
    });

    rendered = await builder.render();
    windowDi = builder.applicationWindow.only.di;

    const dockStore = windowDi.inject(dockStoreInjectable);

    act(() => {
      dockStore.closeTab("terminal");
    });
  });

  it("gives a new tab its own log list instead of the one of the tab before", () => {
    const createLogsTab = windowDi.inject(createPodLogsTabInjectable);

    act(() => {
      createLogsTab({ selectedPod: dockerPod, selectedContainer: container });
    });

    const firstList = rendered.baseElement.querySelector(".LogList");

    act(() => {
      createLogsTab({ selectedPod: dockerPod, selectedContainer: container });
    });

    const secondList = rendered.baseElement.querySelector(".LogList");

    expect(firstList).not.toBeNull();
    expect(secondList).not.toBeNull();
    // The log list wires its reactions to the model of its tab when it mounts: a list handed over from the tab
    // before would keep following that tab, and never scroll the new one to its last lines.
    expect(secondList).not.toBe(firstList);
  });
});
