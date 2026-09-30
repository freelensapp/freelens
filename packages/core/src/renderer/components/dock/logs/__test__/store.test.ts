/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed, observable } from "mobx";
import { LogStore } from "../store";
import { dockerPod } from "./pod.mock";

import type { Pod } from "@freelensapp/kube-object";

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

describe("LogStore request lifecycle", () => {
  const tabId = "logs";
  const initialLog = "2026-01-01T00:00:00Z first line";
  const nextLog = "2026-01-01T00:00:10Z next line";
  const pod = observable.box<Pod | undefined>(undefined, { deep: false });
  const tabData = observable.box<LogTabData | undefined>(undefined);
  const computedPod = computed(() => pod.get());
  const computedTabData = computed(() => tabData.get());
  let callForLogs: ReturnType<typeof vi.fn<CallForLogs>>;
  let store: LogStore;

  beforeEach(() => {
    vi.useFakeTimers();
    pod.set(dockerPod);
    tabData.set({
      namespace: "default",
      selectedPodId: dockerPod.getId(),
      selectedContainer: "docker-exporter",
      showPrevious: false,
      showTimestamps: false,
      showWordWrap: false,
    });
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
    const loading = store.load(tabId, computedPod, computedTabData);
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
    const loading = store.load(tabId, computedPod, computedTabData);

    store.stopLoadingLogs(tabId);
    pod.set(dockerPod);
    await loading;

    expect(callForLogs).not.toHaveBeenCalled();
  });

  it("does not accumulate poll requests while the Pod is missing", async () => {
    await store.load(tabId, computedPod, computedTabData);
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
    await store.load(tabId, computedPod, computedTabData);
    pod.set(undefined);
    await vi.advanceTimersByTimeAsync(30_000);

    store.stopLoadingLogs(tabId);
    pod.set(dockerPod);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(callForLogs).toHaveBeenCalledTimes(1);
    expect(store.getLogs(tabId)).toEqual([initialLog]);
  });

  it("waits for a slow poll to finish before sending another one", async () => {
    await store.load(tabId, computedPod, computedTabData);
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
    await store.load(tabId, computedPod, computedTabData);
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
      const oldLoading = store.load(tabId, computedPod, computedTabData);
      await vi.advanceTimersByTimeAsync(0);

      tabData.set({ ...tabData.get()!, selectedContainer: "another-container" });
      callForLogs.mockResolvedValue(nextLog);
      await store.reload(tabId, computedPod, computedTabData);

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
    const waiting = store.load(tabId, computedPod, computedTabData);

    await store.load(
      "other-tab",
      computed(() => dockerPod),
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
    await store.load(tabId, computedPod, computedTabData);
    const pollResponse = deferred<string>();
    callForLogs.mockReturnValueOnce(pollResponse.promise);
    await vi.advanceTimersByTimeAsync(10_000);

    const olderLog = "2025-12-31T23:59:50Z older line";
    callForLogs.mockResolvedValue(`${olderLog}\n${initialLog}`);
    await store.load(tabId, computedPod, computedTabData);
    pollResponse.resolve(nextLog);
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getLogs(tabId)).toEqual([olderLog, initialLog]);
    expect(callForLogs.mock.calls[2][1]?.tailLines).toBe(501);
  });
});
