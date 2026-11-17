/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWatchReconnect, probeDelay, releaseSpread, watchBackoff } from "./create-watch-reconnect";

import type { WatchReconnectCoordinator } from "./create-watch-reconnect";

describe("createWatchReconnect", () => {
  let probe: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
  let coordinator: WatchReconnectCoordinator;
  let answers: ((answered: boolean) => void)[];

  // With a random number of 1, a wait loses nothing to the jitter and a
  // released watch starts at the end of the spread.
  beforeEach(() => {
    vi.useFakeTimers();
    answers = [];
    probe = vi.fn(() => new Promise<boolean>((resolve) => answers.push(resolve)));
    coordinator = createWatchReconnect({ probe, random: () => 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const answer = async (answered: boolean) => {
    answers.shift()?.(answered);
    await vi.advanceTimersByTimeAsync(0);
  };

  it("backs a watch off only from its second failure in a row", () => {
    expect([1, 2, 3, 4, 5, 6, 10].map(watchBackoff)).toEqual([0, 5_000, 10_000, 20_000, 40_000, 60_000, 60_000]);
  });

  it("probes after 2 seconds, doubling up to 10 seconds", () => {
    expect([0, 1, 2, 3, 10].map(probeDelay)).toEqual([2_000, 4_000, 8_000, 10_000, 10_000]);
  });

  it("starts a watch that failed once as soon as the probe finds the cluster", async () => {
    const reconnect = vi.fn();

    coordinator.schedule(reconnect, 1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(probe).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(probe).toHaveBeenCalledTimes(1);

    await answer(true);
    expect(reconnect).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(releaseSpread);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("sends one probe for all the waiting watches", async () => {
    const reconnects = [vi.fn(), vi.fn(), vi.fn()];

    for (const reconnect of reconnects) {
      coordinator.schedule(reconnect, 1);
    }

    await vi.advanceTimersByTimeAsync(2_000);
    await answer(true);
    await vi.advanceTimersByTimeAsync(releaseSpread);

    expect(probe).toHaveBeenCalledTimes(1);
    for (const reconnect of reconnects) {
      expect(reconnect).toHaveBeenCalledTimes(1);
    }
  });

  it("backs the probe off while the cluster does not answer, and reports it unreachable", async () => {
    coordinator.schedule(vi.fn(), 1);
    expect(coordinator.isClusterUnreachable).toBe(false);

    for (const delay of [2_000, 4_000, 8_000, 10_000, 10_000]) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      const sent = probe.mock.calls.length;

      await vi.advanceTimersByTimeAsync(1);
      expect(probe).toHaveBeenCalledTimes(sent + 1);

      await answer(false);
      expect(coordinator.isClusterUnreachable).toBe(true);
    }
  });

  it("counts a rejected probe as no answer", async () => {
    probe.mockRejectedValueOnce(new Error("offline"));
    coordinator.schedule(vi.fn(), 1);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(coordinator.isClusterUnreachable).toBe(true);
  });

  it("starts the probes over at 2 seconds once the cluster answered", async () => {
    coordinator.schedule(vi.fn(), 1);
    await vi.advanceTimersByTimeAsync(2_000);
    await answer(false);
    await vi.advanceTimersByTimeAsync(4_000);
    await answer(true);
    expect(coordinator.isClusterUnreachable).toBe(false);

    coordinator.schedule(vi.fn(), 1);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(probe).toHaveBeenCalledTimes(3);
  });

  it("starts the waiting watches when one connects, without waiting for the probe", async () => {
    const reconnect = vi.fn();

    coordinator.schedule(reconnect, 1);
    await vi.advanceTimersByTimeAsync(2_000);
    await answer(false);

    coordinator.connected();
    expect(coordinator.isClusterUnreachable).toBe(false);

    await vi.advanceTimersByTimeAsync(releaseSpread);
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("makes a watch that keeps failing wait its own backoff before it waits for the cluster", async () => {
    const reconnect = vi.fn();

    coordinator.schedule(reconnect, 3);
    coordinator.connected();
    await vi.advanceTimersByTimeAsync(9_999 + releaseSpread);
    expect(reconnect).not.toHaveBeenCalled();
    expect(probe).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    coordinator.connected();
    await vi.advanceTimersByTimeAsync(releaseSpread);

    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("probes at once when woken", async () => {
    coordinator.schedule(vi.fn(), 1);
    await vi.advanceTimersByTimeAsync(2_000);
    await answer(false);

    coordinator.wake();

    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("does not probe when no watch waits", async () => {
    coordinator.wake();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(probe).not.toHaveBeenCalled();
  });

  it("does not start a cancelled watch, waiting or already released", async () => {
    const waiting = vi.fn();
    const released = vi.fn();

    const cancelWaiting = coordinator.schedule(waiting, 1);
    const cancelReleased = coordinator.schedule(released, 1);

    cancelWaiting();
    await vi.advanceTimersByTimeAsync(2_000);
    await answer(true);
    cancelReleased();
    await vi.advanceTimersByTimeAsync(releaseSpread);

    expect(waiting).not.toHaveBeenCalled();
    expect(released).not.toHaveBeenCalled();
  });

  it("probes for a watch that started waiting while an outdated probe was out", async () => {
    const reconnect = vi.fn();

    coordinator.schedule(vi.fn(), 1);
    await vi.advanceTimersByTimeAsync(2_000);
    coordinator.connected();
    coordinator.schedule(reconnect, 1);

    await answer(false);
    expect(coordinator.isClusterUnreachable).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(probe).toHaveBeenCalledTimes(2);

    await answer(true);
    await vi.advanceTimersByTimeAsync(releaseSpread);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });
});
