/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { iter } from "@freelensapp/utilities";
import { action, computed, makeObservable, observable, reaction } from "mobx";

import type { Logger } from "@freelensapp/logger";
import type { Disposer } from "@freelensapp/utilities";

import type { IComputedValue, ObservableMap } from "mobx";

import type { CatalogEntity } from "../../../common/catalog";
import type { KubeconfigSyncValue } from "../../../features/user-preferences/common/preferences-helpers";
import type { WatchKubeconfigFileChanges } from "./watch-file-changes.injectable";

interface KubeconfigSyncManagerDependencies {
  readonly directoryForKubeConfigs: string;
  readonly logger: Logger;
  readonly kubeconfigSyncs: ObservableMap<string, KubeconfigSyncValue>;
  watchKubeconfigFileChanges: WatchKubeconfigFileChanges;
}

export class KubeconfigSyncManager {
  protected readonly sources = observable.map<string, [IComputedValue<CatalogEntity[]>, Disposer]>();
  protected syncListDisposer?: Disposer;

  constructor(protected readonly dependencies: KubeconfigSyncManagerDependencies) {
    makeObservable(this);
  }

  public readonly source = computed(() => {
    /**
     * This prevents multiple overlapping syncs from leading to multiple entities with the same IDs
     */
    const seenIds = new Set<string>();

    return iter
      .chain(this.sources.values())
      .flatMap(([entities]) => entities.get())
      .filter((entity) => {
        const alreadySeen = seenIds.has(entity.getId());

        seenIds.add(entity.getId());

        return !alreadySeen;
      })
      .collect((items) => [...items]);
  });

  @action
  startSync(): void {
    this.dependencies.logger.info(`starting requested syncs`);

    this.syncListDisposer = reaction(
      () => Array.from(this.dependencies.kubeconfigSyncs.keys()),
      (currentPaths) => this.reconcile(currentPaths),
      { fireImmediately: true, equals: arraysHaveSameMembers },
    );
  }

  @action
  private reconcile(currentPaths: string[]): void {
    const desired = new Set([this.dependencies.directoryForKubeConfigs, ...currentPaths]);

    for (const filePath of Array.from(this.sources.keys())) {
      if (!desired.has(filePath)) {
        this.stopOldSync(filePath);
      }
    }

    for (const filePath of desired) {
      this.startNewSync(filePath);
    }
  }

  @action
  stopSync() {
    this.dependencies.logger.info(`stopping requested syncs`);
    this.syncListDisposer?.();

    for (const filePath of this.sources.keys()) {
      this.stopOldSync(filePath);
    }
  }

  @action
  protected startNewSync(filePath: string): void {
    if (this.sources.has(filePath)) {
      // don't start a new sync if we already have one
      return this.dependencies.logger.debug(`already syncing file/folder`, { filePath });
    }

    this.sources.set(filePath, this.dependencies.watchKubeconfigFileChanges(filePath));

    this.dependencies.logger.info(`starting sync of file/folder`, { filePath });
    this.dependencies.logger.debug(`${this.sources.size} files/folders watched`, {
      files: Array.from(this.sources.keys()),
    });
  }

  @action
  protected stopOldSync(filePath: string): void {
    const source = this.sources.get(filePath);

    // already stopped
    if (!source) {
      return this.dependencies.logger.debug(`no syncing file/folder to stop`, { filePath });
    }

    const [, disposer] = source;

    disposer();

    this.sources.delete(filePath);

    this.dependencies.logger.info(`stopping sync of file/folder`, { filePath });
    this.dependencies.logger.debug(`${this.sources.size} files/folders watched`, {
      files: Array.from(this.sources.keys()),
    });
  }
}

function arraysHaveSameMembers(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  for (const value of b) {
    if (!set.has(value)) {
      return false;
    }
  }
  return set.size === a.length;
}
