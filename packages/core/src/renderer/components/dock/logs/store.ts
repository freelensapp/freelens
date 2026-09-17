/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { getOrInsertWith, interval } from "@freelensapp/utilities";
import { observable, when } from "mobx";

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
  private readonly requests = new Map<TabId, AbortController>();

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
    computedPod: IComputedValue<Pod | undefined>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    // A manual load supersedes any poll or load from the previous tab selection.
    this.stopLoadingLogs(tabId);

    await this.loadForTab(
      tabId,
      computedPod,
      logTabData,
      {
        tailLines: this.getLogLines(tabId) + logLinesToLoad,
      },
      (logs) => {
        this.getRefresher(tabId, computedPod, logTabData).start();
        this.podLogs.set(tabId, logs);
      },
    );
  }

  private getRefresher(
    tabId: TabId,
    computedPod: IComputedValue<Pod | undefined>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): IntervalFn {
    return getOrInsertWith(this.refreshers, tabId, () =>
      interval(10, () => {
        if (this.podLogs.has(tabId)) {
          this.loadMore(tabId, computedPod, logTabData);
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
    this.refreshers.delete(tabId);
    this.requests.get(tabId)?.abort();
    this.requests.delete(tabId);
  }

  /**
   * Function is used to refresher/stream-like requests.
   * It changes 'sinceTime' param each time allowing to fetch logs
   * starting from last line received.
   * @param tabId
   */
  public async loadMore(
    tabId: TabId,
    computedPod: IComputedValue<Pod | undefined>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    const oldLogs = this.podLogs.get(tabId);

    if (!oldLogs?.length) {
      return;
    }

    await this.loadForTab(
      tabId,
      computedPod,
      logTabData,
      {
        sinceTime: this.getLastSinceTime(tabId),
      },
      (logs) => {
        // Add newly received logs to bottom.
        this.podLogs.set(tabId, [...oldLogs, ...logs.filter(Boolean)]);
      },
    );
  }

  private async loadForTab(
    tabId: TabId,
    computedPod: IComputedValue<Pod | undefined>,
    logTabData: IComputedValue<LogTabData | undefined>,
    params: Partial<PodLogsQuery>,
    onLoad: (logs: string[]) => void,
  ): Promise<void> {
    // Include the wait for Pod data in the limit, not just the HTTP request.
    if (this.requests.has(tabId)) {
      return;
    }

    const controller = new AbortController();
    this.requests.set(tabId, controller);

    try {
      const logs = await this.loadLogs(computedPod, logTabData, params, controller.signal);

      if (!controller.signal.aborted) {
        onLoad(logs);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        this.handlerError(tabId, error);
      }
    } finally {
      // A stopped request must not remove the request started by a newer load.
      if (this.requests.get(tabId) === controller) {
        this.requests.delete(tabId);
      }
    }
  }

  /**
   * Main logs loading function adds necessary data to payload and makes
   * an API request
   * @param tabId
   * @param params request parameters described in IPodLogsQuery interface
   * @returns A fetch request promise
   */
  private async loadLogs(
    computedPod: IComputedValue<Pod | undefined>,
    logTabData: IComputedValue<LogTabData | undefined>,
    params: Partial<PodLogsQuery>,
    signal: AbortSignal,
  ): Promise<string[]> {
    let target: { pod: Pod; tabData: LogTabData } | undefined;

    await when(
      () => {
        const pod = computedPod.get();
        const tabData = logTabData.get();

        if (!pod || !tabData) {
          return false;
        }

        target = { pod, tabData };

        return true;
      },
      { signal },
    );
    signal.throwIfAborted();
    assert(target);

    const {
      pod,
      tabData: { selectedContainer, showPrevious },
    } = target;
    const namespace = pod.getNs();
    const name = pod.getName();

    const result = await this.dependencies.callForLogs(
      { namespace, name },
      {
        ...params,
        timestamps: true, // Always setting timestamp to separate old logs from new ones
        container: selectedContainer,
        previous: showPrevious,
      },
      signal,
    );

    return result.trimEnd().replace(/\r/g, "\n").split("\n");
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
    this.stopLoadingLogs(tabId);
    this.podLogs.delete(tabId);
  }

  reload(
    tabId: TabId,
    computedPod: IComputedValue<Pod | undefined>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    this.clearLogs(tabId);

    return this.load(tabId, computedPod, logTabData);
  }
}
