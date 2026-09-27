/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { computed, observable } from "mobx";
import { maxConcurrentLogRequests, stripAnsiColors } from "../merge-pod-logs";
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

    response.resolve(nextLog);
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

  it("keeps two different lines that carry the same timestamp", async () => {
    const otherLog = "2026-01-01T00:00:00Z second line of that instant";

    await store.load(tabId, computedPods, computedTabData);
    callForLogs.mockResolvedValue(`${initialLog}\n${otherLog}`);
    await vi.advanceTimersByTimeAsync(20_000);

    expect(store.getLogs(tabId)).toEqual([initialLog, otherLog]);
  });
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
