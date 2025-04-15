/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import EventEmitter from "events";
import type { Disposer } from "@freelensapp/utilities";
import type { DiContainerForInjection, InjectionToken } from "@ogre-tools/injectable";
import type TypedEventEmitter from "typed-emitter";
import { convertToWithIdWith, verifyRunnablesAreDAG } from "./helpers";
import type { RunSync, RunnableSync, RunnableSyncWithId } from "./types";

export type RunManySync = <Param>(injectionToken: InjectionToken<RunnableSync<Param>, void>) => RunSync<Param>;

class SyncBarrier {
  private readonly finishedIds = new Set<string>();
  private readonly events: TypedEventEmitter<Record<string, () => void>> = new EventEmitter();

  setFinished(id: string): void {
    this.finishedIds.add(id);
    this.events.emit(id);
  }

  onceParentsAreFinished(id: string, parentIds: string[], action: () => void) {
    const finishers = new Map<string, Disposer>();

    const checkAndRun = () => {
      if (finishers.size === 0) {
        action();
        this.setFinished(id);
      }
    };

    for (const parentId of parentIds) {
      if (this.finishedIds.has(parentId)) {
        continue;
      }

      const onParentFinished = () => {
        this.events.removeListener(parentId, onParentFinished);
        finishers.delete(parentId);
        checkAndRun();
      };

      finishers.set(parentId, onParentFinished);
      this.events.once(parentId, onParentFinished);
    }

    checkAndRun();
  }
}

const executeRunnableWith = <Param>(param: Param) => {
  const barrier = new SyncBarrier();

  return (runnable: RunnableSyncWithId<Param>) => {
    barrier.onceParentsAreFinished(
      runnable.id,
      runnable.runAfter.map((r) => r.id),
      () => runnable.run(param),
    );
  };
};

export function runManySyncFor(di: DiContainerForInjection): RunManySync {
  const convertToWithId = convertToWithIdWith(di);

  return <Param>(injectionToken: InjectionToken<RunnableSync<Param>, void>) =>
    (param: Param): undefined => {
      const executeRunnable = executeRunnableWith(param);
      const allRunnables = di.injectManyWithMeta(injectionToken).map(convertToWithId);

      verifyRunnablesAreDAG(injectionToken.id, allRunnables);

      allRunnables.forEach(executeRunnable);

      return undefined;
    };
}
