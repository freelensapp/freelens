/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import EventEmitter from "events";
import { getOrInsert } from "@freelensapp/utilities";
import type { DiContainerForInjection, InjectionToken } from "@ogre-tools/injectable";
import type { Asyncify } from "type-fest";
import type TypedEventEmitter from "typed-emitter";
import { convertToWithIdWith, verifyRunnablesAreDAG } from "./helpers";
import type { Run, Runnable, RunnableWithId } from "./types";

export type RunMany = <Param>(injectionToken: InjectionToken<Runnable<Param>, void>) => Asyncify<Run<Param>>;

interface BarrierEvent {
  finish: (id: string) => void;
}

class DynamicBarrier {
  private readonly finishedIds = new Map<string, Promise<void>>();
  private readonly events: TypedEventEmitter<BarrierEvent> = new EventEmitter();

  private initFinishingPromise(id: string): Promise<void> {
    return getOrInsert(
      this.finishedIds,
      id,
      new Promise<void>((resolve) => {
        const handler = (finishedId: string) => {
          if (finishedId === id) {
            resolve();
            this.events.removeListener("finish", handler);
          }
        };

        this.events.addListener("finish", handler);
      }),
    );
  }

  setFinished(id: string): void {
    void this.initFinishingPromise(id);

    this.events.emit("finish", id);
  }

  async blockOn(id: string): Promise<void> {
    await this.initFinishingPromise(id);
  }
}

const executeRunnableWith = <Param>(param: Param) => {
  const barrier = new DynamicBarrier();

  return async (runnable: RunnableWithId<Param>): Promise<void> => {
    for (const parentRunnable of runnable.runAfter) {
      await barrier.blockOn(parentRunnable.id);
    }

    await runnable.run(param);
    barrier.setFinished(runnable.id);
  };
};

export function runManyFor(di: DiContainerForInjection): RunMany {
  const convertToWithId = convertToWithIdWith(di);

  return <Param>(injectionToken: InjectionToken<Runnable<Param>, void>) =>
    async (param: Param) => {
      const executeRunnable = executeRunnableWith(param);
      const allRunnables = di.injectManyWithMeta(injectionToken).map((x) => convertToWithId(x));

      verifyRunnablesAreDAG(injectionToken.id, allRunnables);

      await Promise.all(allRunnables.map(executeRunnable));
    };
}
