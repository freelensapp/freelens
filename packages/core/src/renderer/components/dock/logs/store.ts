/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getOrInsertWith, interval } from "@freelensapp/utilities";
import { observable, when } from "mobx";
import {
  compareLogTimestamps,
  getFirstTimestamp,
  getLeadingTimestamp,
  keepNewestLogLines,
  linesBefore,
  logTimestampPattern,
  maxConcurrentLogRequests,
  maxLogLines,
  mergeIntoLogs,
  mergePodLogs,
  missingLinesMarker,
  podLogColors,
  splitLogLines,
} from "./merge-pod-logs";

import type { Pod, PodLogsQuery } from "@freelensapp/kube-object";
import type { IntervalFn } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { TabId } from "../dock/store";
import type { CallForLogs } from "./call-for-logs.injectable";
import type { LogTabData } from "./tab-store";

type PodLogLine = string;

const logLinesToLoad = 500;

// A line can come without the timestamp of the API: see getLeadingTimestamp.
const timestampAndLine = new RegExp(`^(${logTimestampPattern})(?=\\s|$)(.*)`, "m");
const timestamps = new RegExp(`^${logTimestampPattern}(?=\\s|$)`, "gm");
const timestampsAndSeparator = new RegExp(`^${logTimestampPattern}(?:\\s|$)`, "gm");

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
  private readonly podColors = new Map<TabId, Map<string, string>>();
  // How many lines every pod has in the tab, by pod id.
  private readonly lineCounts = new Map<TabId, Map<string, number>>();

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
   * Each time it increasing it's number, caused to fetch more logs: every
   * pod is asked for the lines it already has in the tab and
   * `logLinesToLoad` more.
   * Also, it handles loading errors, rewriting whole logs with error
   * messages
   */
  public async load(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void> {
    // A full tab holds no older line: asking for them would only fetch the
    // lines it shows again. Its refresh goes on.
    if ((this.podLogs.get(tabId)?.length ?? 0) >= maxLogLines) {
      return;
    }

    // A manual load supersedes any poll or load from the previous tab selection.
    this.stopLoadingLogs(tabId);

    const lineCounts = this.lineCounts.get(tabId);

    await this.loadForTab(
      tabId,
      computedPods,
      logTabData,
      (pod, podCount) => ({ tailLines: this.getTailLines(lineCounts?.get(pod.getId()) ?? 0, podCount) }),
      (logsOfPods, tagged) => {
        const oldLogs = this.podLogs.get(tabId) ?? [];
        const oldCursors = this.cursors.get(tabId);
        const cursors = new Map<string, PodLogsCursor>();
        const newLineCounts = new Map<string, number>();

        this.cursors.set(tabId, cursors);
        this.lineCounts.set(tabId, newLineCounts);

        const answer = this.mergeNewLines(tabId, cursors, logsOfPods, tagged);

        // A pod that brought no line, as one whose log was rotated a moment
        // ago or whose request failed, keeps its place, so that the refresh
        // does not ask it again for lines the tab still has.
        for (const [podId, cursor] of oldCursors ?? []) {
          if (!cursors.has(podId)) {
            cursors.set(podId, cursor);
            newLineCounts.set(podId, lineCounts?.get(podId) ?? 0);
          }
        }

        this.getRefresher(tabId, computedPods, logTabData).start();
        this.podLogs.set(tabId, this.limitLines(this.withOlderLines(oldLogs, answer, logsOfPods)));
      },
    );
  }

  /**
   * The answer of a load of older lines, with the lines of the tab that it
   * does not reach in front of it. The kubelet rotates the log of a container,
   * and `tailLines` reads the current file only, so the answer can start later
   * than the tab, or bring nothing at all.
   */
  private withOlderLines(oldLogs: string[], answer: string[], logsOfPods: PodLogs[]): string[] {
    const starts = logsOfPods.map(({ lines }) => getFirstTimestamp(lines)).filter((start) => start !== undefined);

    if (starts.length === 0) {
      return oldLogs.length > 0 ? oldLogs : answer;
    }

    // The latest start, so that no pod loses a line: the lines of the pods
    // whose answer starts earlier come back in it, and are not kept twice.
    const start = starts.reduce((latest, timestamp) =>
      compareLogTimestamps(timestamp, latest) > 0 ? timestamp : latest,
    );
    const older = linesBefore(oldLogs, start, new Set(answer));

    return older.length > 0 ? mergeIntoLogs(older, answer) : answer;
  }

  /**
   * The lines to ask a pod for: the ones it has in the tab and
   * `logLinesToLoad` more. In a combined tab every pod asks for its own lines,
   * not the lines of the whole tab. No pod asks for more than its share of
   * `maxLogLines`, all of it for a single pod, even when the polling has given
   * it more since: the tab keeps no more than that, so a request for more
   * would only be cut.
   */
  private getTailLines(podLines: number, podCount: number): number {
    const share = podCount <= 1 ? maxLogLines : Math.max(logLinesToLoad, Math.floor(maxLogLines / podCount));

    return Math.min(podLines + logLinesToLoad, share);
  }

  /**
   * Every tab keeps its newest `maxLogLines` lines.
   */
  private limitLines(logs: string[]): string[] {
    return keepNewestLogLines(logs, maxLogLines);
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
        const newLines = this.mergeNewLines(tabId, cursors, logsOfPods, tagged);

        // Add newly received logs to bottom.
        this.podLogs.set(tabId, this.limitLines(mergeIntoLogs(this.podLogs.get(tabId) ?? oldLogs, newLines)));
      },
    );
  }

  private async loadForTab(
    tabId: TabId,
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
    getParams: (pod: Pod, podCount: number) => Partial<PodLogsQuery>,
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
   * @param getParams request parameters described in IPodLogsQuery interface,
   * for a pod and the number of pods of the tab
   * @param signal cancels the wait for the pods and the requests
   * @returns The lines of every pod that answered
   */
  private async loadLogs(
    computedPods: IComputedValue<Pod[]>,
    logTabData: IComputedValue<LogTabData | undefined>,
    getParams: (pod: Pod, podCount: number) => Partial<PodLogsQuery>,
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
              ...getParams(pod, pods.length),
              timestamps: true, // Always setting timestamp to separate old logs from new ones
              container: selectedContainer,
              previous: showPrevious,
            },
            signal,
          );

          logsOfPods.push({ pod, lines: splitLogLines(result) });
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
  private mergeNewLines(
    tabId: TabId,
    cursors: Map<string, PodLogsCursor>,
    logsOfPods: PodLogs[],
    tagged: boolean,
  ): string[] {
    const linesByPodName = new Map<string, string[]>();
    const colors = getOrInsertWith(this.podColors, tabId, () => new Map<string, string>());
    const lineCounts = getOrInsertWith(this.lineCounts, tabId, () => new Map<string, number>());

    // Every pod keeps, as long as the tab is not reloaded, the color it got
    // when the tab first read it: the next one of the palette.
    for (const { pod } of logsOfPods) {
      if (!colors.has(pod.getName())) {
        colors.set(pod.getName(), podLogColors[colors.size % podLogColors.length]);
      }
    }

    for (const { pod, lines } of logsOfPods) {
      const podId = pod.getId();
      let cursor = cursors.get(podId);
      const lastTimestamp = cursor?.timestamp;
      let isNew = !cursor;
      const newLines: string[] = [];
      // The lines as the API counts them for tailLines: the pieces of a line
      // split on "\r" carry no timestamp.
      let newApiLines = 0;

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

          if (isNew) {
            newApiLines += 1;
          }
        }

        // A line without a timestamp continues the line before it.
        if (isNew && (line || newLines.length > 0)) {
          newLines.push(line);
        }
      }

      // An answer since the second of the last line brings that line again,
      // unless the file that held it is gone: the kubelet rotated the log, or
      // the container restarted, and the lines in between may be lost.
      const firstTimestamp = getFirstTimestamp(lines);

      if (
        lastTimestamp !== undefined &&
        firstTimestamp !== undefined &&
        newLines.length > 0 &&
        compareLogTimestamps(firstTimestamp, lastTimestamp) > 0
      ) {
        newLines.unshift(missingLinesMarker(firstTimestamp));
      }

      if (cursor) {
        cursors.set(podId, cursor);
      }

      lineCounts.set(podId, (lineCounts.get(podId) ?? 0) + newApiLines);
      linesByPodName.set(pod.getName(), newLines);
    }

    return mergePodLogs(linesByPodName, { tagged, colors });
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
    const extraction = timestampAndLine.exec(logs);

    if (!extraction || extraction.length < 3) {
      return ["", logs];
    }

    return [extraction[1], extraction[2]];
  }

  getTimestamps(logs: string) {
    return logs.match(timestamps);
  }

  removeTimestamps(logs: string): string {
    return logs.replace(timestampsAndSeparator, "");
  }

  clearLogs(tabId: TabId): void {
    this.stopLoadingLogs(tabId);
    this.podLogs.delete(tabId);
    this.cursors.delete(tabId);
    this.podColors.delete(tabId);
    this.lineCounts.delete(tabId);
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
