/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { computed, observable } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMaxCombinedLogsPods } from "../../../../../features/user-preferences/common/preferences-helpers";
import {
  maxConcurrentLogRequests,
  maxLogLines,
  missingLinesMarker,
  podLogColors,
  stripAnsiColors,
} from "../merge-pod-logs";
import { LogStore } from "../store";
import { dockerPod } from "./pod.mock";

import type { CallForLogs } from "../call-for-logs.injectable";
import type { LogTabData } from "../tab-store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function createPod(name: string): Pod {
  return new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      uid: `uid-of-${name}`,
      name,
      resourceVersion: "1",
      namespace: "default",
      selfLink: `/api/v1/namespaces/default/pods/${name}`,
    },
    spec: {
      containers: [{ name: "app", image: "app:1", imagePullPolicy: "IfNotPresent" }],
    },
  });
}

const tabData: LogTabData = {
  namespace: "default",
  selectedPodId: dockerPod.getId(),
  selectedContainer: "docker-exporter",
  showPrevious: false,
  showTimestamps: false,
  showWordWrap: false,
};

describe("LogStore request lifecycle", () => {
  const tabId = "logs";
  const initialLog = "2026-01-01T00:00:00Z first line";
  const nextLog = "2026-01-01T00:00:10Z next line";
  const pod = observable.box<Pod | undefined>(undefined, { deep: false });
  const observableTabData = observable.box<LogTabData | undefined>(undefined);
  const computedPods = computed(() => {
    const value = pod.get();

    return value ? [value] : [];
  });
  const computedTabData = computed(() => observableTabData.get());
  let callForLogs: ReturnType<typeof vi.fn<CallForLogs>>;
  let store: LogStore;

  beforeEach(() => {
    vi.useFakeTimers();
    pod.set(dockerPod);
    observableTabData.set(tabData);
    callForLogs = vi.fn<CallForLogs>().mockResolvedValue(initialLog);
    store = new LogStore({ callForLogs });
  });

  afterEach(() => {
    store.stopLoadingLogs(tabId);
    store.stopLoadingLogs("other-tab");
    vi.useRealTimers();
  });

  it("does not restart polling when an initial response arrives after leaving the tab", async () => {
    const response = deferred<string>();
    callForLogs.mockReturnValueOnce(response.promise);
    const loading = store.load(tabId, computedPods, computedTabData);
    await vi.advanceTimersByTimeAsync(0);

    store.stopLoadingLogs(tabId);
    response.resolve(initialLog);
    await loading;
    await vi.advanceTimersByTimeAsync(30_000);

    expect(callForLogs).toHaveBeenCalledTimes(1);
    expect(store.getLogs(tabId)).toEqual([]);
  });

  it("cancels an initial load waiting for the Pod instead of requesting it after the tab stops", async () => {
    pod.set(undefined);
    const loading = store.load(tabId, computedPods, computedTabData);

    store.stopLoadingLogs(tabId);
    pod.set(dockerPod);
    await loading;

    expect(callForLogs).not.toHaveBeenCalled();
  });

  it("does not accumulate poll requests while the Pod is missing", async () => {
    await store.load(tabId, computedPods, computedTabData);
    pod.set(undefined);
    await vi.advanceTimersByTimeAsync(3_600_000);

    expect(callForLogs).toHaveBeenCalledTimes(1);

    pod.set(dockerPod);
    await vi.advanceTimersByTimeAsync(0);
    expect(callForLogs).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(callForLogs).toHaveBeenCalledTimes(3);
  });

  it("cancels a waiting poll when the tab stops", async () => {
    await store.load(tabId, computedPods, computedTabData);
    pod.set(undefined);
    await vi.advanceTimersByTimeAsync(30_000);

    store.stopLoadingLogs(tabId);
    pod.set(dockerPod);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(callForLogs).toHaveBeenCalledTimes(1);
    expect(store.getLogs(tabId)).toEqual([initialLog]);
  });

  it("waits for a slow poll to finish before sending another one", async () => {
    await store.load(tabId, computedPods, computedTabData);
    const response = deferred<string>();
    callForLogs.mockReturnValueOnce(response.promise);

    await vi.advanceTimersByTimeAsync(70_000);
    expect(callForLogs).toHaveBeenCalledTimes(2);

    // As the API does, the answer since the second of the last line brings that line again.
    response.resolve(`${initialLog}\n${nextLog}`);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getLogs(tabId)).toEqual([initialLog, nextLog]);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(callForLogs).toHaveBeenCalledTimes(3);
  });

  it("aborts an in-flight poll and ignores its late result after stopping", async () => {
    await store.load(tabId, computedPods, computedTabData);
    const response = deferred<string>();
    callForLogs.mockReturnValueOnce(response.promise);
    await vi.advanceTimersByTimeAsync(10_000);
    const signal = callForLogs.mock.calls[1][2];

    store.stopLoadingLogs(tabId);
    response.resolve(nextLog);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(signal?.aborted).toBe(true);
    expect(store.getLogs(tabId)).toEqual([initialLog]);
    expect(callForLogs).toHaveBeenCalledTimes(2);
  });

  it.each(["resolve", "reject"] as const)(
    "ignores an old request that completes with %s after reloading another container",
    async (completion) => {
      const response = deferred<string>();
      callForLogs.mockReturnValueOnce(response.promise);
      const oldLoading = store.load(tabId, computedPods, computedTabData);
      await vi.advanceTimersByTimeAsync(0);

      observableTabData.set({ ...tabData, selectedContainer: "another-container" });
      callForLogs.mockResolvedValue(nextLog);
      await store.reload(tabId, computedPods, computedTabData);

      if (completion === "resolve") {
        response.resolve(initialLog);
      } else {
        response.reject(new Error("old request failed"));
      }

      await oldLoading;
      expect(store.getLogs(tabId)).toEqual([nextLog]);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(callForLogs).toHaveBeenCalledTimes(3);
      expect(callForLogs.mock.calls[2][1]?.container).toBe("another-container");
    },
  );

  it("can load another tab while the first tab is waiting for its Pod", async () => {
    pod.set(undefined);
    const waiting = store.load(tabId, computedPods, computedTabData);

    await store.load(
      "other-tab",
      computed(() => [dockerPod]),
      computedTabData,
    );
    expect(store.getLogs("other-tab")).toEqual([initialLog]);

    store.stopLoadingLogs(tabId);
    pod.set(dockerPod);
    await waiting;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(callForLogs).toHaveBeenCalledTimes(2);
  });

  it("loads older lines without allowing an outstanding poll to overwrite them", async () => {
    await store.load(tabId, computedPods, computedTabData);
    const pollResponse = deferred<string>();
    callForLogs.mockReturnValueOnce(pollResponse.promise);
    await vi.advanceTimersByTimeAsync(10_000);

    const olderLog = "2025-12-31T23:59:50Z older line";
    callForLogs.mockResolvedValue(`${olderLog}\n${initialLog}`);
    await store.load(tabId, computedPods, computedTabData);
    pollResponse.resolve(nextLog);
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getLogs(tabId)).toEqual([olderLog, initialLog]);
    expect(callForLogs.mock.calls[2][1]?.tailLines).toBe(501);
  });

  it("keeps polling a tab that loaded without any line, and shows the first ones when they come", async () => {
    callForLogs.mockResolvedValue("");
    await store.load(tabId, computedPods, computedTabData);
    expect(store.getLogs(tabId)).toEqual([]);

    callForLogs.mockResolvedValue(initialLog);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(store.getLogs(tabId)).toEqual([initialLog]);
  });

  it("asks again for the second of the last line, and does not show that line twice", async () => {
    const lastLog = "2026-01-01T00:00:05.250000000Z last line";
    const sameSecondLog = "2026-01-01T00:00:05.750000000Z line of the same second";

    callForLogs.mockResolvedValue(lastLog);
    await store.load(tabId, computedPods, computedTabData);

    callForLogs.mockResolvedValue(`${lastLog}\n${sameSecondLog}`);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(callForLogs.mock.calls[1][1]?.sinceTime).toBe("2026-01-01T00:00:05Z");
    expect(store.getLogs(tabId)).toEqual([lastLog, sameSecondLog]);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(store.getLogs(tabId)).toEqual([lastLog, sameSecondLog]);
  });

  it.each([
    ["is empty", "2026-01-01T00:00:05.250000000Z ", "2026-01-01T00:00:05.250000000Z "],
    ["ends with a space", "2026-01-01T00:00:05.250000000Z last line ", "2026-01-01T00:00:05.250000000Z last line "],
    [
      "ends with a carriage return",
      "2026-01-01T00:00:05.250000000Z last line\r",
      "2026-01-01T00:00:05.250000000Z last line",
    ],
  ])("does not show the last line twice when it %s", async (_case, written, shown) => {
    const nextLog = "2026-01-01T00:00:06.250000000Z next line";

    callForLogs.mockResolvedValue(`${written}\n`);
    await store.load(tabId, computedPods, computedTabData);
    expect(store.getLogs(tabId)).toEqual([shown]);

    callForLogs.mockResolvedValue(`${written}\n${nextLog}\n`);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(store.getLogs(tabId)).toEqual([shown, nextLog]);
  });

  it("does not add an empty line after a line that ends with \\r\\n", async () => {
    callForLogs.mockResolvedValue(
      "2026-01-01T00:00:01Z first line\r\n2026-01-01T00:00:02Z second line\r\n2026-01-01T00:00:03Z progress 50%\rprogress 100%\r\n",
    );
    await store.load(tabId, computedPods, computedTabData);

    expect(store.getLogs(tabId)).toEqual([
      "2026-01-01T00:00:01Z first line",
      "2026-01-01T00:00:02Z second line",
      "2026-01-01T00:00:03Z progress 50%",
      "progress 100%",
    ]);
  });

  it("keeps two different lines that carry the same timestamp", async () => {
    const otherLog = "2026-01-01T00:00:00Z second line of that instant";

    await store.load(tabId, computedPods, computedTabData);
    callForLogs.mockResolvedValue(`${initialLog}\n${otherLog}`);
    await vi.advanceTimersByTimeAsync(20_000);

    expect(store.getLogs(tabId)).toEqual([initialLog, otherLog]);
  });

  it("keeps what follows a carriage return as a line of its own, also when it starts with a digit", async () => {
    const progressLog = "2026-01-01T00:00:00.123456789Z step 1 pulling layer";

    callForLogs.mockResolvedValue(`${progressLog}\r12.5MB/40MB`);
    await store.load(tabId, computedPods, computedTabData);

    expect(store.getLogs(tabId)).toEqual([progressLog, "12.5MB/40MB"]);
  });

  // "45%" reads as a date in 2045, "5.2MB/40MB" as no date at all.
  it.each(["45% done", "5.2MB/40MB"])(
    "keeps reading after %j, a line without a timestamp that starts with a number",
    async (piece) => {
      const firstLog = "2026-01-01T00:00:05.250000000Z step 1 pulling layer";
      const secondLog = "2026-01-01T00:00:06.250000000Z step 2 pulling layer";

      callForLogs.mockResolvedValue(`${firstLog}\r${piece}`);
      await store.load(tabId, computedPods, computedTabData);

      callForLogs.mockResolvedValue(`${firstLog}\r${piece}\n${secondLog}\r${piece}`);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(callForLogs.mock.calls[1][1]?.sinceTime).toBe("2026-01-01T00:00:05Z");
      expect(store.getLogs(tabId)).toEqual([firstLog, piece, secondLog, piece]);
    },
  );
});

describe("LogStore timestamps", () => {
  const store = new LogStore({ callForLogs: vi.fn<CallForLogs>() });

  it("splits off the timestamp that the API puts at the start of a line", () => {
    expect(store.splitOutTimestamp("2026-01-01T00:00:00.123456789Z first line")).toEqual([
      "2026-01-01T00:00:00.123456789Z",
      " first line",
    ]);
    expect(store.splitOutTimestamp("2026-01-01T07:00:00+07:00 first line")).toEqual([
      "2026-01-01T07:00:00+07:00",
      " first line",
    ]);
    expect(store.removeTimestamps("2026-01-01T00:00:00Z first line")).toBe("first line");
    expect(store.getTimestamps("2026-01-01T00:00:00Z first line")).toEqual(["2026-01-01T00:00:00Z"]);
  });

  it("takes a line with nothing but its timestamp, such as an empty last line, for a timestamp", () => {
    expect(store.splitOutTimestamp("2026-01-01T00:00:00Z")).toEqual(["2026-01-01T00:00:00Z", ""]);
    expect(store.removeTimestamps("2026-01-01T00:00:00Z")).toBe("");
    expect(store.getTimestamps("2026-01-01T00:00:00Z")).toEqual(["2026-01-01T00:00:00Z"]);
  });

  it.each(["12.5MB/40MB", "100/100 done", "10.0.0.1 - GET /", "45% done", "1730877328 started"])(
    "keeps %j, a line without a timestamp, whole",
    (line) => {
      expect(store.splitOutTimestamp(line)).toEqual(["", line]);
      expect(store.removeTimestamps(line)).toBe(line);
      expect(store.getTimestamps(line)).toBeNull();
    },
  );
});

describe("LogStore combined logs", () => {
  const tabId = "logs";
  const podA = createPod("pod-a");
  const podB = createPod("pod-b");
  const pods = observable.box<Pod[]>([], { deep: false });
  const computedPods = computed(() => pods.get());
  const computedTabData = computed(() => tabData);
  let logsOfPods: Map<string, string>;
  let callForLogs: ReturnType<typeof vi.fn<CallForLogs>>;
  let store: LogStore;

  const getLogs = () => store.getLogs(tabId).map(stripAnsiColors);
  const getCallsFor = (name: string) => callForLogs.mock.calls.filter(([params]) => params.name === name);

  beforeEach(() => {
    vi.useFakeTimers();
    pods.set([podA, podB]);
    logsOfPods = new Map([
      ["pod-a", "2026-01-01T00:00:01.000000000Z a1\n2026-01-01T00:00:05.500000000Z a2"],
      ["pod-b", "2026-01-01T00:00:03.200000000Z b1"],
    ]);
    callForLogs = vi.fn<CallForLogs>(async ({ name }) => logsOfPods.get(name) ?? "");
    store = new LogStore({ callForLogs });
  });

  afterEach(() => {
    store.stopLoadingLogs(tabId);
    vi.useRealTimers();
  });

  it("shows the lines of all the pods in chronological order, each with the name of its pod", async () => {
    await store.load(tabId, computedPods, computedTabData);

    expect(getLogs()).toEqual([
      "2026-01-01T00:00:01.000000000Z [pod-a] a1",
      "2026-01-01T00:00:03.200000000Z [pod-b] b1",
      "2026-01-01T00:00:05.500000000Z [pod-a] a2",
    ]);
  });

  it("gives every pod its own color, and keeps it when the pods of the workload change", async () => {
    const getColorOf = (name: string) =>
      store
        .getLogs(tabId)
        .filter((line) => line.includes(`[${name}]`))
        .map((line) => /\u001B\[([\d;]+)m/.exec(line)?.[1]);

    await store.load(tabId, computedPods, computedTabData);
    logsOfPods.set("pod-b", "2026-01-01T00:00:03.200000000Z b1\n2026-01-01T00:00:07.000000000Z b2");
    logsOfPods.set("pod-c", "2026-01-01T00:00:06.000000000Z c1");
    pods.set([podB, createPod("pod-c")]);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(getColorOf("pod-a")).toEqual([podLogColors[0], podLogColors[0]]);
    expect(getColorOf("pod-b")).toEqual([podLogColors[1], podLogColors[1]]);
    expect(getColorOf("pod-c")).toEqual([podLogColors[2]]);
  });

  it("asks every pod for the lines that follow its own last line", async () => {
    await store.load(tabId, computedPods, computedTabData);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(getCallsFor("pod-a")[1][1]).toMatchObject({ sinceTime: "2026-01-01T00:00:05Z" });
    expect(getCallsFor("pod-b")[1][1]).toMatchObject({ sinceTime: "2026-01-01T00:00:03Z" });
  });

  it("does not lose the line of a pod that is behind the last line of another pod", async () => {
    await store.load(tabId, computedPods, computedTabData);
    logsOfPods.set("pod-b", "2026-01-01T00:00:03.200000000Z b1\n2026-01-01T00:00:04.100000000Z b2");
    await vi.advanceTimersByTimeAsync(10_000);

    expect(getLogs()).toEqual([
      "2026-01-01T00:00:01.000000000Z [pod-a] a1",
      "2026-01-01T00:00:03.200000000Z [pod-b] b1",
      "2026-01-01T00:00:04.100000000Z [pod-b] b2",
      "2026-01-01T00:00:05.500000000Z [pod-a] a2",
    ]);
  });

  it("does not show again the lines the API returns a second time", async () => {
    await store.load(tabId, computedPods, computedTabData);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(getLogs()).toHaveLength(3);
  });

  it("follows the workload: reads a pod that joins it and stops reading one that leaves", async () => {
    const podC = createPod("pod-c");

    await store.load(tabId, computedPods, computedTabData);
    logsOfPods.set("pod-c", "2026-01-01T00:00:06.000000000Z c1");
    pods.set([podB, podC]);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(getCallsFor("pod-a")).toHaveLength(1);
    expect(getCallsFor("pod-c")[0][1]).toMatchObject({ tailLines: 500 });
    expect(getLogs()).toEqual([
      "2026-01-01T00:00:01.000000000Z [pod-a] a1",
      "2026-01-01T00:00:03.200000000Z [pod-b] b1",
      "2026-01-01T00:00:05.500000000Z [pod-a] a2",
      "2026-01-01T00:00:06.000000000Z [pod-c] c1",
    ]);
  });

  it("waits for the workload to have pods again without sending requests", async () => {
    await store.load(tabId, computedPods, computedTabData);
    pods.set([]);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(callForLogs).toHaveBeenCalledTimes(2);

    pods.set([podB]);
    await vi.advanceTimersByTimeAsync(0);

    expect(callForLogs).toHaveBeenCalledTimes(3);
  });

  it("keeps the lines of the other pods when one pod fails", async () => {
    callForLogs.mockImplementation(async ({ name }) => {
      if (name === "pod-b") {
        throw new Error("pod-b is gone");
      }

      return logsOfPods.get(name) ?? "";
    });
    await store.load(tabId, computedPods, computedTabData);

    expect(getLogs()).toEqual([
      "2026-01-01T00:00:01.000000000Z [pod-a] a1",
      "2026-01-01T00:00:05.500000000Z [pod-a] a2",
    ]);
  });

  it("shows the error when every pod fails", async () => {
    callForLogs.mockRejectedValue(Object.assign(new Error("forbidden"), { reason: "Forbidden", code: 403 }));
    await store.load(tabId, computedPods, computedTabData);

    expect(getLogs()).toEqual(["Failed to load logs: forbidden", "Reason: Forbidden (403)"]);
  });

  it("asks every pod for its own lines and 500 more when loading older lines", async () => {
    await store.load(tabId, computedPods, computedTabData);
    await store.load(tabId, computedPods, computedTabData);

    expect(getCallsFor("pod-a").map(([, query]) => query?.tailLines)).toEqual([500, 502]);
    expect(getCallsFor("pod-b").map(([, query]) => query?.tailLines)).toEqual([500, 501]);
  });

  it("asks for older lines in steps of 500 per pod, not of the lines of the whole tab", async () => {
    callForLogs.mockImplementation(async ({ name }, query) =>
      Array.from({ length: query?.tailLines ?? 0 }, (_, index) => `2026-01-01T00:00:00Z ${name} ${index}`).join("\n"),
    );

    for (let scroll = 0; scroll < 3; scroll += 1) {
      await store.load(tabId, computedPods, computedTabData);
    }

    expect(getCallsFor("pod-a").map(([, query]) => query?.tailLines)).toEqual([500, 1000, 1500]);
    expect(getLogs()).toHaveLength(3000);
  });

  it("asks every pod for at most its share of the lines of a combined tab", async () => {
    const share = Math.floor(maxLogLines / defaultMaxCombinedLogsPods);
    const manyPods = Array.from({ length: defaultMaxCombinedLogsPods }, (_, index) => createPod(`pod-${index}`));

    callForLogs.mockImplementation(async ({ name }) =>
      Array.from({ length: share - 100 }, (_, index) => `2026-01-01T00:00:00Z ${name} ${index}`).join("\n"),
    );
    pods.set(manyPods);
    await store.load(tabId, computedPods, computedTabData);
    await store.load(tabId, computedPods, computedTabData);

    expect(getCallsFor("pod-0").map(([, query]) => query?.tailLines)).toEqual([500, share]);
  });

  it("asks no pod for more than its share, even when it has more", async () => {
    const share = Math.floor(maxLogLines / defaultMaxCombinedLogsPods);
    const manyPods = Array.from({ length: defaultMaxCombinedLogsPods }, (_, index) => createPod(`pod-${index}`));

    // Only pod-0 has more than its share, so that the tab is not full.
    callForLogs.mockImplementation(async ({ name }) =>
      Array.from(
        { length: name === "pod-0" ? share + 100 : 10 },
        (_, index) => `2026-01-01T00:00:00Z ${name} ${index}`,
      ).join("\n"),
    );
    pods.set(manyPods);
    await store.load(tabId, computedPods, computedTabData);
    await store.load(tabId, computedPods, computedTabData);

    expect(getCallsFor("pod-0").map(([, query]) => query?.tailLines)).toEqual([500, share]);
  });

  describe("when the refresh brings more lines than the tab holds", () => {
    const linesPerPod = Math.ceil((maxLogLines * 3) / 4);
    // The lines of the two pods take turns, a millisecond apart, after the ones of the first load.
    const newLinesOf = (name: string, offset: number) =>
      Array.from(
        { length: linesPerPod },
        (_, index) => `${new Date(Date.UTC(2026, 0, 1, 0, 1) + index * 2 + offset).toISOString()} ${name} ${index}`,
      ).join("\n");
    const newestLine = `${new Date(Date.UTC(2026, 0, 1, 0, 1) + (linesPerPod - 1) * 2 + 1).toISOString()} [pod-b] pod-b ${linesPerPod - 1}`;

    beforeEach(() => {
      callForLogs.mockImplementation(async ({ name }, query) => {
        if (!query?.sinceTime) {
          return logsOfPods.get(name) ?? "";
        }

        return newLinesOf(name, name === "pod-a" ? 0 : 1);
      });
    });

    it("keeps the newest lines of a combined tab, up to its limit", async () => {
      await store.load(tabId, computedPods, computedTabData);
      await vi.advanceTimersByTimeAsync(10_000);

      const logs = getLogs();

      expect(logs).toHaveLength(maxLogLines);
      expect(logs.at(-1)).toBe(newestLine);
      expect(logs.some((line) => line.endsWith("[pod-a] a1"))).toBe(false);
    });

    it("keeps the newest lines of the tab of a single pod, up to the same limit", async () => {
      const lineOf = (index: number) => `${new Date(Date.UTC(2026, 0, 1, 0, 1) + index).toISOString()} pod-a ${index}`;
      const refreshed = Array.from({ length: maxLogLines + 100 }, (_, index) => lineOf(index)).join("\n");

      callForLogs.mockImplementation(async ({ name }, query) =>
        query?.sinceTime ? refreshed : (logsOfPods.get(name) ?? ""),
      );
      pods.set([podA]);
      await store.load(tabId, computedPods, computedTabData);
      await vi.advanceTimersByTimeAsync(10_000);

      const logs = getLogs();

      expect(logs).toHaveLength(maxLogLines);
      expect(logs[0]).toBe(lineOf(100));
      expect(logs.at(-1)).toBe(lineOf(maxLogLines + 99));
    });
  });

  it("counts the lines that the polling added when loading older lines", async () => {
    await store.load(tabId, computedPods, computedTabData);
    logsOfPods.set("pod-b", "2026-01-01T00:00:03.200000000Z b1\n2026-01-01T00:00:07.000000000Z b2");
    await vi.advanceTimersByTimeAsync(10_000);
    await store.load(tabId, computedPods, computedTabData);

    expect(getCallsFor("pod-a").at(-1)?.[1]?.tailLines).toBe(502);
    expect(getCallsFor("pod-b").at(-1)?.[1]?.tailLines).toBe(502);
  });

  it("counts a line that ends with \\r\\n once", async () => {
    logsOfPods.set("pod-a", "2026-01-01T00:00:01Z a1\r\n2026-01-01T00:00:02Z a2\r\n2026-01-01T00:00:03Z a3\r\n");
    await store.load(tabId, computedPods, computedTabData);
    await store.load(tabId, computedPods, computedTabData);

    expect(getCallsFor("pod-a").map(([, query]) => query?.tailLines)).toEqual([500, 503]);
  });

  it("asks a single pod for no more lines than a tab holds", async () => {
    callForLogs.mockImplementation(async ({ name }) =>
      Array.from({ length: maxLogLines - 100 }, (_, index) => `2026-01-01T00:00:00Z ${name} ${index}`).join("\n"),
    );
    pods.set([podA]);
    await store.load(tabId, computedPods, computedTabData);
    await store.load(tabId, computedPods, computedTabData);

    expect(getCallsFor("pod-a").map(([, query]) => query?.tailLines)).toEqual([500, maxLogLines]);
  });

  it("does not ask for older lines once the tab is full, and keeps refreshing it", async () => {
    callForLogs.mockImplementation(async ({ name }, query) =>
      query?.sinceTime
        ? ""
        : Array.from({ length: maxLogLines }, (_, index) => `2026-01-01T00:00:00Z ${name} ${index}`).join("\n"),
    );
    pods.set([podA]);
    await store.load(tabId, computedPods, computedTabData);
    await store.load(tabId, computedPods, computedTabData);

    expect(getCallsFor("pod-a")).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(getCallsFor("pod-a")).toHaveLength(2);
    expect(getCallsFor("pod-a")[1][1]).toHaveProperty("sinceTime");
  });

  describe("when loading older lines after the log was rotated", () => {
    // A line of a pod at second `second`, as the API returns it.
    const lineOf = (name: string, second: number) =>
      `${new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString()} ${name} ${second}`;
    const linesOf = (name: string, seconds: number[]) => seconds.map((second) => lineOf(name, second)).join("\n");
    const taggedLineOf = (name: string, second: number) =>
      `${new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString()} [${name}] ${name} ${second}`;
    let answers: Map<string, string[]>;

    beforeEach(() => {
      answers = new Map();
      // Every load takes the next answer of its pod; the refresh gets nothing new.
      callForLogs.mockImplementation(async ({ name }, query) =>
        query?.sinceTime ? "" : (answers.get(name)?.shift() ?? ""),
      );
    });

    it("keeps the lines of the tab that the answer of a single pod no longer reaches", async () => {
      answers.set("pod-a", [linesOf("pod-a", [1, 2, 3, 4, 5, 6]), linesOf("pod-a", [4, 5, 6, 7, 8])]);
      pods.set([podA]);
      await store.load(tabId, computedPods, computedTabData);
      await store.load(tabId, computedPods, computedTabData);

      expect(getLogs()).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((second) => lineOf("pod-a", second)));
    });

    it("keeps the tab when the answer brings nothing, and goes on refreshing from its last line", async () => {
      answers.set("pod-a", [linesOf("pod-a", [1, 2, 3]), ""]);
      pods.set([podA]);
      await store.load(tabId, computedPods, computedTabData);
      await store.load(tabId, computedPods, computedTabData);

      expect(getLogs()).toEqual([1, 2, 3].map((second) => lineOf("pod-a", second)));

      await vi.advanceTimersByTimeAsync(10_000);

      expect(getCallsFor("pod-a").at(-1)?.[1]).toMatchObject({ sinceTime: "2026-01-01T00:00:03Z" });
    });

    it("keeps every line of a combined tab once when the answer of one pod starts later", async () => {
      answers.set("pod-a", [linesOf("pod-a", [1, 3, 5, 7, 9]), linesOf("pod-a", [5, 7, 9, 11])]);
      answers.set("pod-b", [linesOf("pod-b", [2, 4, 6, 8, 10]), linesOf("pod-b", [2, 4, 6, 8, 10, 12])]);
      await store.load(tabId, computedPods, computedTabData);
      await store.load(tabId, computedPods, computedTabData);

      expect(getLogs()).toEqual(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((second) => taggedLineOf(second % 2 ? "pod-a" : "pod-b", second)),
      );
    });
  });

  describe("when the log was rotated between two refreshes", () => {
    const timestampOf = (second: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString();
    const lineOf = (name: string, second: number) => `${timestampOf(second)} ${name} ${second}`;
    const linesOf = (name: string, seconds: number[]) => seconds.map((second) => lineOf(name, second)).join("\n");
    const tagged = (name: string, line: string) => line.replace(/^(\S+) /, `$1 [${name}] `);
    let refreshes: Map<string, string[]>;

    beforeEach(() => {
      refreshes = new Map();
      callForLogs.mockImplementation(async ({ name }, query) =>
        query?.sinceTime ? (refreshes.get(name)?.shift() ?? "") : (logsOfPods.get(name) ?? ""),
      );
    });

    it("marks where lines may be missing when the answer no longer brings the last line", async () => {
      logsOfPods.set("pod-a", linesOf("pod-a", [1, 2, 3]));
      refreshes.set("pod-a", [linesOf("pod-a", [6, 7])]);
      pods.set([podA]);
      await store.load(tabId, computedPods, computedTabData);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(getLogs()).toEqual([
        lineOf("pod-a", 1),
        lineOf("pod-a", 2),
        lineOf("pod-a", 3),
        missingLinesMarker(timestampOf(6)),
        lineOf("pod-a", 6),
        lineOf("pod-a", 7),
      ]);
    });

    it("adds no mark when the answer brings the last line again", async () => {
      logsOfPods.set("pod-a", linesOf("pod-a", [1, 2, 3]));
      refreshes.set("pod-a", [linesOf("pod-a", [3, 4, 5])]);
      pods.set([podA]);
      await store.load(tabId, computedPods, computedTabData);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(getLogs()).toEqual([1, 2, 3, 4, 5].map((second) => lineOf("pod-a", second)));
    });

    it("marks only the pod of a combined tab whose lines may be missing, in front of its first new line", async () => {
      logsOfPods.set("pod-a", linesOf("pod-a", [1, 3]));
      logsOfPods.set("pod-b", linesOf("pod-b", [2, 4]));
      refreshes.set("pod-a", [linesOf("pod-a", [7, 9])]);
      refreshes.set("pod-b", [linesOf("pod-b", [4, 6, 8])]);
      await store.load(tabId, computedPods, computedTabData);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(getLogs()).toEqual([
        tagged("pod-a", lineOf("pod-a", 1)),
        tagged("pod-b", lineOf("pod-b", 2)),
        tagged("pod-a", lineOf("pod-a", 3)),
        tagged("pod-b", lineOf("pod-b", 4)),
        tagged("pod-b", lineOf("pod-b", 6)),
        tagged("pod-a", missingLinesMarker(timestampOf(7))),
        tagged("pod-a", lineOf("pod-a", 7)),
        tagged("pod-b", lineOf("pod-b", 8)),
        tagged("pod-a", lineOf("pod-a", 9)),
      ]);
    });
  });

  it("never sends more requests at the same time than the limit", async () => {
    const manyPods = Array.from({ length: maxConcurrentLogRequests * 3 }, (_, index) => createPod(`pod-${index}`));
    const responses = new Map(manyPods.map((pod) => [pod.getName(), deferred<string>()]));
    let inFlight = 0;
    let maxInFlight = 0;

    callForLogs.mockImplementation(async ({ name }) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      try {
        return await responses.get(name)!.promise;
      } finally {
        inFlight -= 1;
      }
    });
    pods.set(manyPods);

    const loading = store.load(tabId, computedPods, computedTabData);

    await vi.advanceTimersByTimeAsync(0);
    expect(callForLogs).toHaveBeenCalledTimes(maxConcurrentLogRequests);

    for (const [name, response] of responses) {
      response.resolve(`2026-01-01T00:00:00.000000000Z line of ${name}`);
      await vi.advanceTimersByTimeAsync(0);
    }

    await loading;

    expect(maxInFlight).toBe(maxConcurrentLogRequests);
    expect(callForLogs).toHaveBeenCalledTimes(manyPods.length);
    expect(getLogs()).toHaveLength(manyPods.length);
  });

  it("aborts the requests of all the pods when the tab stops", async () => {
    const response = deferred<string>();

    callForLogs.mockReturnValue(response.promise);
    const loading = store.load(tabId, computedPods, computedTabData);

    await vi.advanceTimersByTimeAsync(0);
    store.stopLoadingLogs(tabId);
    response.resolve("2026-01-01T00:00:00.000000000Z late line");
    await loading;

    expect(callForLogs.mock.calls.map(([, , signal]) => signal?.aborted)).toEqual([true, true]);
    expect(getLogs()).toEqual([]);
  });
});
