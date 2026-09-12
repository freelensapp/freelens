/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { isDefined } from "@freelensapp/utilities";
import { computed } from "mobx";
import { defaultLogViewerPreferences } from "../../../../features/user-preferences/common/preferences-helpers";

import type { ResourceDescriptor } from "@freelensapp/kube-api";
import type { Pod, PodLogsQuery } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";

import type { LogViewerPreferences } from "../../../../features/user-preferences/common/preferences-helpers";
import type { UserPreferencesState } from "../../../../features/user-preferences/common/state.injectable";
import type { SearchStore } from "../../../search-store/search-store";
import type { GetPodById } from "../../workloads-pods/get-pod-by-id.injectable";
import type { GetPodsByOwnerId } from "../../workloads-pods/get-pods-by-owner-id.injectable";
import type { TabId } from "../dock/store";
import type { LoadLogs } from "./load-logs.injectable";
import type { LogTabData } from "./tab-store";

export interface LogTabViewModelDependencies {
  getLogs: (tabId: TabId) => string[];
  getLogsWithoutTimestamps: (tabId: TabId) => string[];
  getTimestampSplitLogs: (tabId: TabId) => [string, string][];
  getLogTabData: (tabId: TabId) => LogTabData | undefined;
  setLogTabData: (tabId: TabId, data: LogTabData) => void;
  loadLogs: LoadLogs;
  reloadLogs: (
    tabId: TabId,
    pods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ) => Promise<void>;
  renameTab: (tabId: TabId, title: string) => void;
  stopLoadingLogs: (tabId: TabId) => void;
  getPodById: GetPodById;
  getPodsByOwnerId: GetPodsByOwnerId;
  areLogsPresent: (tabId: TabId) => boolean;
  downloadLogs: (filename: string, logs: string[]) => void;
  downloadAllLogs: (params: ResourceDescriptor, query: PodLogsQuery) => Promise<void>;
  downloadAllLogsForPods: (
    filename: string,
    pods: readonly { name: string; namespace: string }[],
    query: PodLogsQuery,
  ) => Promise<void>;
  searchStore: SearchStore;
  userPreferencesState: UserPreferencesState;
}

export class LogTabViewModel {
  constructor(
    protected readonly tabId: TabId,
    private readonly dependencies: LogTabViewModelDependencies,
  ) {}

  get searchStore() {
    return this.dependencies.searchStore;
  }

  readonly isLoading = computed(() => this.dependencies.areLogsPresent(this.tabId));
  readonly logs = computed(() => this.dependencies.getLogs(this.tabId));
  readonly logsWithoutTimestamps = computed(() => this.dependencies.getLogsWithoutTimestamps(this.tabId));
  readonly timestampSplitLogs = computed(() => this.dependencies.getTimestampSplitLogs(this.tabId));
  readonly logTabData = computed(() => this.dependencies.getLogTabData(this.tabId));
  readonly pods = computed(() => {
    const data = this.logTabData.get();

    if (!data) {
      return [];
    }

    if (typeof data.owner?.uid === "string") {
      return this.dependencies.getPodsByOwnerId(data.owner.uid);
    }

    return [this.dependencies.getPodById(data.selectedPodId)].filter(isDefined);
  });
  readonly pod = computed(() => {
    const data = this.logTabData.get();

    if (!data) {
      return undefined;
    }

    return this.dependencies.getPodById(data.selectedPodId);
  });

  /**
   * True when this tab combines the logs of more than one pod (a "combined
   * logs" tab opened for a workload) rather than showing a single pod.
   */
  readonly isMerged = computed(() => (this.logTabData.get()?.mergedPodIds?.length ?? 0) > 0);

  /**
   * The pods whose logs are fetched and merged into this tab's log stream:
   * just the selected pod normally, or the selected pod plus every pod listed
   * in `mergedPodIds` for a combined logs tab.
   */
  readonly logSourcePods = computed(() => {
    const data = this.logTabData.get();

    if (!data) {
      return [];
    }

    const podIds = [data.selectedPodId, ...(data.mergedPodIds ?? [])];

    return podIds.map((id) => this.dependencies.getPodById(id)).filter(isDefined);
  });

  updateLogTabData = (partialData: Partial<LogTabData>) => {
    const data = this.logTabData.get();

    assert(data, "Can only update data once it is set");

    this.dependencies.setLogTabData(this.tabId, { ...data, ...partialData });
  };

  updateLogPreferences = (partialPreferences: Partial<LogViewerPreferences>) => {
    // Update the current tab and the saved defaults for future log tabs only.
    const logViewerPreferences =
      this.dependencies.userPreferencesState.logViewerPreferences ?? defaultLogViewerPreferences;

    this.dependencies.userPreferencesState.logViewerPreferences = {
      ...logViewerPreferences,
      ...partialPreferences,
    };

    this.updateLogTabData(partialPreferences);
  };

  loadLogs = () => this.dependencies.loadLogs(this.tabId, this.logSourcePods, this.logTabData);
  reloadLogs = () => this.dependencies.reloadLogs(this.tabId, this.logSourcePods, this.logTabData);
  renameTab = (title: string) => this.dependencies.renameTab(this.tabId, title);
  stopLoadingLogs = () => this.dependencies.stopLoadingLogs(this.tabId);

  downloadLogs = () => {
    const tabData = this.logTabData.get();
    const pods = this.logSourcePods.get();

    if (pods.length && tabData) {
      // A combined logs tab is named after the workload it was opened for, not
      // any single one of its pods.
      const fileName = this.isMerged.get() && tabData.owner ? tabData.owner.name : pods[0].getName();
      const logsToDownload: string[] = tabData.showTimestamps ? this.logs.get() : this.logsWithoutTimestamps.get();

      this.dependencies.downloadLogs(`${fileName}.log`, logsToDownload);
    }
  };

  downloadAllLogs = () => {
    const tabData = this.logTabData.get();
    const pods = this.logSourcePods.get();

    if (!pods.length || !tabData) {
      return;
    }

    const query = {
      timestamps: tabData.showTimestamps,
      previous: tabData.showPrevious,
      container: tabData.selectedContainer,
    };

    if (this.isMerged.get()) {
      const fileName = tabData.owner?.name ?? pods[0].getName();
      const podDescriptors = pods.map((pod) => ({ name: pod.getName(), namespace: pod.getNs() }));

      return this.dependencies.downloadAllLogsForPods(fileName, podDescriptors, query);
    }

    const params = { name: pods[0].getName(), namespace: pods[0].getNs() };

    return this.dependencies.downloadAllLogs(params, query);
  };
}
