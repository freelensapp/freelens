/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import userPreferencesStateInjectable from "../../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { maxCombinedLogsPods } from "../merge-pod-logs";
import { deploymentPod1, deploymentPod2, dockerPod } from "./pod.mock";
import { createMockLogTabViewModel, getDefaultOnePodLogTabData } from "./test-utils";

import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";

describe("LogTabViewModel", () => {
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    userPreferencesState = di.inject(userPreferencesStateInjectable);
  });

  it("updates the saved log viewer preferences and the current tab data", () => {
    const setLogTabData = vi.fn();
    const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
      getLogTabData: () => getDefaultOnePodLogTabData(),
      setLogTabData,
    });

    model.updateLogPreferences({ showTimestamps: true });

    expect(userPreferencesState.logViewerPreferences).toEqual({
      showTimestamps: true,
      showWordWrap: true,
    });
    expect(setLogTabData).toHaveBeenCalledWith("tab-id", {
      ...getDefaultOnePodLogTabData(),
      showTimestamps: true,
    });
  });

  describe("given the tab of a single pod", () => {
    const coloredLine = "2026-01-01T00:00:00Z \x1b[31merror\x1b[0m from the application";

    it("reads the logs of that pod", () => {
      const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
        getLogTabData: () => getDefaultOnePodLogTabData(),
        getPodById: (id) => (id === dockerPod.getId() ? dockerPod : undefined),
      });

      expect(model.isMerged.get()).toBe(false);
      expect(model.logSourcePods.get()).toEqual([dockerPod]);
    });

    it("downloads the visible logs as they are, colors of the application included", () => {
      const downloadLogs = vi.fn();
      const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
        getLogTabData: () => getDefaultOnePodLogTabData({ showTimestamps: true }),
        getPodById: () => dockerPod,
        getLogs: () => [coloredLine],
        downloadLogs,
      });

      model.downloadLogs();

      expect(downloadLogs).toHaveBeenCalledWith("dockerExporter.log", [coloredLine]);
    });
  });

  describe("given the combined tab of a workload", () => {
    const getCombinedLogTabData = () =>
      getDefaultOnePodLogTabData({
        selectedPodId: "uid-of-a-pod-that-is-gone",
        combined: true,
        podSelector: ["app=super"],
        showTimestamps: true,
        owner: { uid: "uuid", kind: "Deployment", name: "super-deployment" },
      });

    it("reads the pods the workload has now", () => {
      const getWorkloadPods = vi.fn(() => [deploymentPod1, deploymentPod2]);
      const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
        getLogTabData: getCombinedLogTabData,
        getWorkloadPods,
      });

      expect(model.isMerged.get()).toBe(true);
      expect(model.logSourcePods.get()).toEqual([deploymentPod1, deploymentPod2]);
      expect(model.pod.get()).toBe(deploymentPod1);
      expect(getWorkloadPods).toHaveBeenCalledWith({
        owner: { uid: "uuid", kind: "Deployment", name: "super-deployment" },
        namespace: "default",
        podSelector: ["app=super"],
      });
    });

    it("reads a limited number of pods of a large workload", () => {
      const manyPods = Array.from({ length: maxCombinedLogsPods + 5 }, () => deploymentPod1);
      const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
        getLogTabData: getCombinedLogTabData,
        getWorkloadPods: () => manyPods,
      });

      expect(model.workloadPods.get()).toHaveLength(maxCombinedLogsPods + 5);
      expect(model.logSourcePods.get()).toHaveLength(maxCombinedLogsPods);
    });

    it("downloads the visible logs under the name of the workload, without color codes", () => {
      const downloadLogs = vi.fn();
      const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
        getLogTabData: getCombinedLogTabData,
        getWorkloadPods: () => [deploymentPod1, deploymentPod2],
        getLogs: () => ["2026-01-01T00:00:00Z \x1b[36m[deploymentPod1]\x1b[0m hello"],
        downloadLogs,
      });

      model.downloadLogs();

      expect(downloadLogs).toHaveBeenCalledWith("super-deployment.log", [
        "2026-01-01T00:00:00Z [deploymentPod1] hello",
      ]);
    });

    it("downloads all the logs of the pods it reads, under the name of the workload", () => {
      const downloadAllLogsForPods = vi.fn();
      const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
        getLogTabData: getCombinedLogTabData,
        getWorkloadPods: () => [deploymentPod1, deploymentPod2],
        downloadAllLogsForPods,
      });

      model.downloadAllLogs();

      expect(downloadAllLogsForPods).toHaveBeenCalledWith(
        "super-deployment",
        [
          { name: "deploymentPod1", namespace: "default" },
          { name: "deploymentPod2", namespace: "default" },
        ],
        { timestamps: true, previous: false, container: "docker-exporter" },
      );
    });
  });
});
