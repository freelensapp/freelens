/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observable, runInAction } from "mobx";

import type { WatchReconnect } from "../../../common/k8s-api/watch-reconnect";

export interface WatchReconnectDependencies {
  /**
   * Resolves to true when the cluster answers. A rejection counts as no answer.
   */
  probe(): Promise<boolean>;
  random?: () => number;
}

export interface WatchReconnectCoordinator extends WatchReconnect {
  /**
   * Something suggests the cluster may answer again, such as the network
   * coming back: check now rather than at the next scheduled probe.
   */
  wake(): void;
}

/**
 * The own wait of a watch that failed `failures` times in a row before it
 * waits for the cluster. The first failure waits for nothing else, so that a
 * cluster that comes back gets its watches back at once. A watch that keeps
 * failing while the cluster answers, such as one of an unavailable APIService,
 * backs off from 5 seconds up to a minute.
 */
export const watchBackoff = (failures: number): number =>
  failures <= 1 ? 0 : Math.min(60_000, 5_000 * 2 ** (failures - 2));

/**
 * The wait before the probe that follows `attempt` failed probes. One probe
 * stands for all the watches of the cluster, so it can be frequent.
 */
export const probeDelay = (attempt: number): number => Math.min(10_000, 2_000 * 2 ** attempt);

/**
 * The released watches start at random within this time, so that they do not
 * reach an API server that has just come back all at once.
 */
export const releaseSpread = 2_000;

interface Waiting {
  readonly reconnect: () => void;
  timer?: ReturnType<typeof setTimeout>;
  cancelled: boolean;
}

export const createWatchReconnect = ({
  probe,
  random = Math.random,
}: WatchReconnectDependencies): WatchReconnectCoordinator => {
  // Up to a quarter is taken off each wait, so that the watches and the frames
  // of several clusters that failed together do not retry together.
  const jitter = (ms: number) => Math.round(ms * (0.75 + 0.25 * random()));

  const waiting = new Set<Waiting>();
  const unreachable = observable.box(false);
  let probeTimer: ReturnType<typeof setTimeout> | undefined;
  let probing = false;
  let attempt = 0;
  // Tells apart the result of a probe sent before the waiting watches were
  // released, which must not mark a cluster that answers as unreachable.
  let generation = 0;

  const setUnreachable = (value: boolean) => {
    if (unreachable.get() !== value) {
      runInAction(() => unreachable.set(value));
    }
  };

  const release = () => {
    clearTimeout(probeTimer);
    probeTimer = undefined;
    attempt = 0;
    generation += 1;
    setUnreachable(false);

    for (const entry of waiting) {
      entry.timer = setTimeout(
        () => {
          if (!entry.cancelled) {
            entry.reconnect();
          }
        },
        Math.round(random() * releaseSpread),
      );
    }

    waiting.clear();
  };

  const runProbe = () => {
    probeTimer = undefined;

    if (waiting.size === 0) {
      return;
    }

    const sentIn = generation;

    probing = true;
    probe()
      .catch(() => false)
      .then((answered) => {
        probing = false;

        if (sentIn === generation) {
          if (answered) {
            release();

            return;
          }

          attempt += 1;
          setUnreachable(true);
        }

        // Also after a result that came too late: watches that started
        // waiting while it was out still need a probe.
        scheduleProbe();
      });
  };

  const scheduleProbe = () => {
    if (probing || probeTimer || waiting.size === 0) {
      return;
    }

    probeTimer = setTimeout(runProbe, jitter(probeDelay(attempt)));
  };

  return {
    schedule: (reconnect, failures) => {
      const entry: Waiting = { reconnect, cancelled: false };
      const wait = () => {
        entry.timer = undefined;
        waiting.add(entry);
        scheduleProbe();
      };
      const backoff = watchBackoff(failures);

      if (backoff > 0) {
        entry.timer = setTimeout(wait, jitter(backoff));
      } else {
        wait();
      }

      return () => {
        entry.cancelled = true;
        clearTimeout(entry.timer);
        waiting.delete(entry);
      };
    },

    connected: release,

    wake: () => {
      if (probing || waiting.size === 0) {
        return;
      }

      clearTimeout(probeTimer);
      runProbe();
    },

    get isClusterUnreachable() {
      return unreachable.get();
    },
  };
};
