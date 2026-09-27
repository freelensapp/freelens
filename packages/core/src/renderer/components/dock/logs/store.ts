/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getOrInsertWith, interval } from "@freelensapp/utilities";
import { observable, when } from "mobx";
import {
  compareLogTimestamps,
  getLeadingTimestamp,
  maxConcurrentLogRequests,
  mergeIntoLogs,
  mergePodLogs,
} from "./merge-pod-logs";

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

/**
 * How far the lines of a pod have been read: the timestamp of the newest line
 * and the lines that carry it, which the next request returns again.
 */
interface PodLogsCursor {
  timestamp: string;
  lines: Set<string>;
}

interface PodLogs {
  pod: Pod;
  lines: string[];
}

export class LogStore {
  protected podLogs = observable.map<TabId, PodLogLine[]>();
  protected refreshers = new Map<TabId, IntervalFn>();
  private readonly requests = new Map<TabId, AbortController>();
  private readonly cursors = new Map<TabId, Map<string, PodLogsCursor>>();

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
    // A manual load supersedes any poll or load from the previous tab selection.
    this.stopLoadingLogs(tabId);

    const tailLines = this.getLogLines(tabId) + logLinesToLoad;

    await this.loadForTab(
      tabId,
      computedPods,
      logTabData,
      () => ({ tailLines }),
      (logsOfPods, tagged) => {
        const cursors = new Map<string, PodLogsCursor>();

        this.cursors.set(tabId, cursors);
        this.getRefresher(tabId, computedPods, logTabData).start();
        this.podLogs.set(tabId, this.mergeNewLines(cursors, logsOfPods, tagged));
      },
    );
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
    this.refreshers.delete(tabId);
    this.requests.get(tabId)?.abort();
    this.requests.delete(tabId);
  }

  /**
   * Function is used to refresher/stream-like requests.
   * Every pod is asked for the lines that follow the last one received from
   * it, so the pods of a combined tab do not have to be in step.
   * @param tabId
   */
  public async loadMore(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    const oldLogs = this.podLogs.get(tabId);

    // A loaded tab keeps polling when it is empty: the first lines of a
    // container that has not written anything yet arrive this way.
    if (!oldLogs) {
      return;
    }

    const cursors = getOrInsertWith(this.cursors, tabId, () => new Map<string, PodLogsCursor>());

    await this.loadForTab(
      tabId,
      computedPods,
      logTabData,
      (pod) => {
        const cursor = cursors.get(pod.getId());

        // A pod that joined the workload after the last load has no lines yet.
        return cursor ? { sinceTime: this.getSinceTime(cursor.timestamp) } : { tailLines: logLinesToLoad };
      },
      (logsOfPods, tagged) => {
        const newLines = this.mergeNewLines(cursors, logsOfPods, tagged);

        // Add newly received logs to bottom.
        this.podLogs.set(tabId, mergeIntoLogs(this.podLogs.get(tabId) ?? oldLogs, newLines));
      },
    );
  }

  private async loadForTab(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
    getParams: (pod: Pod) => Partial<PodLogsQuery>,
    onLoad: (logsOfPods: PodLogs[], tagged: boolean) => void,
  ): Promise<void> {
    // Include the wait for Pod data in the limit, not just the HTTP request.
    if (this.requests.has(tabId)) {
      return;
    }

    const controller = new AbortController();

    this.requests.set(tabId, controller);

    try {
      const { logsOfPods, tagged } = await this.loadLogs(computedPods, logTabData, getParams, controller.signal);

      if (!controller.signal.aborted) {
        onLoad(logsOfPods, tagged);
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
   * Main logs loading function adds necessary data to payload and makes an API
   * request per pod, a few at a time.
   * @param computedPods the pod(s) to fetch logs for; more than one means this
   * is a combined logs tab
   * @param logTabData
   * @param getParams request parameters described in IPodLogsQuery interface
   * @param signal cancels the wait for the pods and the requests
   * @returns The lines of every pod that answered
   */
  private async loadLogs(
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
    getParams: (pod: Pod) => Partial<PodLogsQuery>,
    signal: AbortSignal,
  ): Promise<{ logsOfPods: PodLogs[]; tagged: boolean }> {
    let target: { pods: Pod[]; tabData: LogTabData } | undefined;

    await when(
      () => {
        const pods = computedPods.get();
        const tabData = logTabData.get();

        if (!pods.length || !tabData) {
          return false;
        }

        target = { pods, tabData };

        return true;
      },
      { signal },
    );
    signal.throwIfAborted();

    if (!target) {
      throw new Error("The Pods and the tab data are not available after the wait");
    }

    const {
      pods,
      tabData: { selectedContainer, showPrevious },
    } = target;
    const logsOfPods: PodLogs[] = [];
    const errors: unknown[] = [];
    const queue = [...pods];

    const readNextPod = async (): Promise<void> => {
      for (let pod = queue.shift(); pod && !signal.aborted; pod = queue.shift()) {
        try {
          const result = await this.dependencies.callForLogs(
            { namespace: pod.getNs(), name: pod.getName() },
            {
              ...getParams(pod),
              timestamps: true, // Always setting timestamp to separate old logs from new ones
              container: selectedContainer,
              previous: showPrevious,
            },
            signal,
          );

          logsOfPods.push({ pod, lines: result.trimEnd().replace(/\r/g, "\n").split("\n") });
        } catch (error) {
          errors.push(error);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(maxConcurrentLogRequests, pods.length) }, readNextPod));
    signal.throwIfAborted();

    // Only surface an error (and blank out the tab) when every pod failed; a
    // single pod being briefly unreachable (e.g. it just got deleted) shouldn't
    // wipe out the logs still being received from the rest of a combined tab.
    if (logsOfPods.length === 0 && errors.length > 0) {
      throw errors[0];
    }

    // The pods answer in any order: put them back in the order of the tab.
    logsOfPods.sort((a, b) => pods.indexOf(a.pod) - pods.indexOf(b.pod));

    return { logsOfPods, tagged: pods.length > 1 };
  }

  /**
   * Keeps, of the lines received from every pod, the ones that follow its
   * cursor, moves the cursor and merges what is left in chronological order.
   */
  private mergeNewLines(cursors: Map<string, PodLogsCursor>, logsOfPods: PodLogs[], tagged: boolean): string[] {
    const linesByPodName = new Map<string, string[]>();

    for (const { pod, lines } of logsOfPods) {
      const podId = pod.getId();
      let cursor = cursors.get(podId);
      let isNew = !cursor;
      const newLines: string[] = [];

      for (const line of lines) {
        const timestamp = getLeadingTimestamp(line);

        if (timestamp) {
          const order = cursor ? compareLogTimestamps(timestamp, cursor.timestamp) : 1;

          isNew = order > 0 || (order === 0 && !cursor?.lines.has(line));

          if (isNew && cursor && order === 0) {
            cursor.lines.add(line);
          } else if (isNew) {
            cursor = { timestamp, lines: new Set([line]) };
          }
        }

        // A line without a timestamp continues the line before it.
        if (isNew && (line || newLines.length > 0)) {
          newLines.push(line);
        }
      }

      if (cursor) {
        cursors.set(podId, cursor);
      }

      linesByPodName.set(pod.getName(), newLines);
    }

    return mergePodLogs(linesByPodName, { tagged });
  }

  /**
   * The API takes `sinceTime` to the second, so the request starts from the
   * second of the last line and the lines already received are dropped when
   * they come back.
   */
  private getSinceTime(timestamp: string): string {
    const time = Date.parse(timestamp);
    const since = Number.isNaN(time) ? new Date() : new Date(Math.floor(time / 1000) * 1000);

    return since.toISOString().replace(/\.\d+Z$/, "Z");
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
    this.cursors.delete(tabId);
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
