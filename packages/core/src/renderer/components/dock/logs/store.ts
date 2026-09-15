/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getOrInsertWith, interval, waitUntilDefined } from "@freelensapp/utilities";
import { observable } from "mobx";
import { mergePodLogs } from "./merge-pod-logs";

import type { Pod, PodLogsQuery } from "@freelensapp/kube-object";
import type { IntervalFn } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { TabId } from "../dock/store";
import type { CallForLogs } from "./call-for-logs.injectable";
import type { LogTabData } from "./tab-store";

type PodLogLine = string;

const logLinesToLoad = 500;

interface Dependencies {
  callForLogs: CallForLogs;
}

export class LogStore {
  protected podLogs = observable.map<TabId, PodLogLine[]>();
  protected refreshers = new Map<TabId, IntervalFn>();

  constructor(private dependencies: Dependencies) {}

  protected handlerError(tabId: TabId, error: any): void {
    if (error.error && !(error.message || error.reason || error.code)) {
      error = error.error;
    }

    const message = [`Failed to load logs: ${error.message}`, `Reason: ${error.reason} (${error.code})`];

    this.stopLoadingLogs(tabId);
    this.podLogs.set(tabId, message);
  }

  /**
   * Function prepares tailLines param for passing to API request
   * Each time it increasing it's number, caused to fetch more logs.
   * Also, it handles loading errors, rewriting whole logs with error
   * messages
   */
  public async load(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    try {
      const linesByPod = await this.loadLogs(computedPods, logTabData, {
        tailLines: this.getLogLines(tabId) + logLinesToLoad,
      });

      this.getRefresher(tabId, computedPods, logTabData).start();
      this.podLogs.set(tabId, mergePodLogs(linesByPod));
    } catch (error) {
      this.handlerError(tabId, error);
    }
  }

  private getRefresher(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): IntervalFn {
    return getOrInsertWith(this.refreshers, tabId, () =>
      interval(10, () => {
        if (this.podLogs.has(tabId)) {
          this.loadMore(tabId, computedPods, logTabData);
        }
      }),
    );
  }

  /**
   * Stop loading more logs for a given tab
   * @param tabId The ID of the logs tab to stop loading more logs for
   */
  public stopLoadingLogs(tabId: TabId): void {
    this.refreshers.get(tabId)?.stop();
  }

  /**
   * Function is used to refresher/stream-like requests.
   * It changes 'sinceTime' param each time allowing to fetch logs
   * starting from last line received.
   * @param tabId
   */
  public async loadMore(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    const oldLogs = this.podLogs.get(tabId);

    if (!oldLogs?.length) {
      return;
    }

    try {
      const linesByPod = await this.loadLogs(computedPods, logTabData, {
        sinceTime: this.getLastSinceTime(tabId),
      });

      // Every pod's new lines are all chronologically after everything already
      // shown (they were all fetched with the same `sinceTime`, derived from the
      // most recent line already in `oldLogs`), so merging just this batch and
      // appending it keeps the whole buffer in order without re-merging history.
      const newLines = mergePodLogs(linesByPod).filter(Boolean);

      // Add newly received logs to bottom
      this.podLogs.set(tabId, [...oldLogs, ...newLines]);
    } catch (error) {
      this.handlerError(tabId, error);
    }
  }

  /**
   * Main logs loading function adds necessary data to payload and makes an API
   * request per pod (in parallel), keyed by pod name for tagging/merging.
   * @param computedPods the pod(s) to fetch logs for; more than one means this
   * is a combined logs tab
   * @param logTabData
   * @param params request parameters described in IPodLogsQuery interface
   * @returns A map of pod name to its fetched log lines
   */
  private async loadLogs(
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
    params: Partial<PodLogsQuery>,
  ): Promise<Map<string, string[]>> {
    const {
      pods,
      tabData: { selectedContainer, showPrevious },
    } = await waitUntilDefined(() => {
      const pods = computedPods.get();
      const tabData = logTabData.get();

      if (pods.length && tabData) {
        return { pods, tabData };
      }

      return undefined;
    });

    const results = await Promise.allSettled(
      pods.map(async (pod) => {
        const result = await this.dependencies.callForLogs(
          { namespace: pod.getNs(), name: pod.getName() },
          {
            ...params,
            timestamps: true, // Always setting timestamp to separate old logs from new ones
            container: selectedContainer,
            previous: showPrevious,
          },
        );

        return {
          podName: pod.getName(),
          lines: result.trimEnd().replace(/\r/g, "\n").split("\n").filter(Boolean),
        };
      }),
    );

    const linesByPod = new Map<string, string[]>();
    const errors: unknown[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        linesByPod.set(result.value.podName, result.value.lines);
      } else {
        errors.push(result.reason);
      }
    }

    // Only surface an error (and blank out the tab) when every pod failed; a
    // single pod being briefly unreachable (e.g. it just got deleted) shouldn't
    // wipe out the logs still being received from the rest of a combined tab.
    if (linesByPod.size === 0 && errors.length > 0) {
      throw errors[0];
    }

    return linesByPod;
  }

  /**
   * @deprecated This depends on dockStore, which should be removed
   * Converts logs into a string array
   * @returns Length of log lines
   */
  get lines(): number {
    return this.logs.length;
  }

  getLogLines(tabId: TabId): number {
    return this.getLogs(tabId).length;
  }

  areLogsPresent(tabId: TabId): boolean {
    return !this.podLogs.has(tabId);
  }

  getLogs(tabId: TabId): string[] {
    return this.podLogs.get(tabId) ?? [];
  }

  getLogsWithoutTimestamps(tabId: TabId): string[] {
    return this.getLogs(tabId).map(this.removeTimestamps);
  }

  getTimestampSplitLogs(tabId: TabId): [string, string][] {
    return this.getLogs(tabId).map(this.splitOutTimestamp);
  }

  /**
   * @deprecated This now only returns the empty array
   * Returns logs with timestamps for selected tab
   */
  get logs(): string[] {
    return [];
  }

  /**
   * @deprecated This now only returns the empty array
   * Removes timestamps from each log line and returns changed logs
   * @returns Logs without timestamps
   */
  get logsWithoutTimestamps(): string[] {
    return this.logs.map((item) => this.removeTimestamps(item));
  }

  /**
   * It gets timestamps from all logs then returns last one + 1 second
   * (this allows to avoid getting the last stamp in the selection)
   * @param tabId
   */
  getLastSinceTime(tabId: TabId): string {
    const logs = this.podLogs.get(tabId) ?? [];
    const [timestamp] = this.getTimestamps(logs[logs.length - 1]) ?? [];
    const stamp = timestamp ? new Date(timestamp) : new Date();

    stamp.setSeconds(stamp.getSeconds() + 1); // avoid duplicates from last second

    return stamp.toISOString();
  }

  splitOutTimestamp(logs: string): [string, string] {
    const extraction = /^(\d+\S+)(.*)/m.exec(logs);

    if (!extraction || extraction.length < 3) {
      return ["", logs];
    }

    return [extraction[1], extraction[2]];
  }

  getTimestamps(logs: string) {
    return logs.match(/^\d+\S+/gm);
  }

  removeTimestamps(logs: string): string {
    return logs.replace(/^\d+.*?\s/gm, "");
  }

  clearLogs(tabId: TabId): void {
    this.podLogs.delete(tabId);
  }

  reload(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    this.clearLogs(tabId);

    return this.load(tabId, computedPods, logTabData);
  }
}
