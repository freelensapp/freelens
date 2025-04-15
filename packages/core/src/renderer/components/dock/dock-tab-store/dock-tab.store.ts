/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import autoBind from "auto-bind";
import { action, observable, reaction } from "mobx";
import { toJS } from "../../../../common/utils";
import type { CreateStorage } from "../../../utils/create-storage/create-storage.injectable";
import type { StorageLayer } from "../../../utils/storage-helper";
import type { TabId } from "../dock/store";

export interface DockTabStoreOptions {
  autoInit?: boolean; // load data from storage when `storageKey` is provided and bind events, default: true
  storageKey?: string; // save data to persistent storage under the key
}

export type DockTabStorageState<T> = Record<TabId, T>;

export interface DockTabStoreDependencies {
  createStorage: CreateStorage;
}

export class DockTabStore<T> {
  protected readonly storage?: StorageLayer<DockTabStorageState<T>>;
  private readonly data = observable.map<TabId, T>();

  constructor(
    protected readonly dependencies: DockTabStoreDependencies,
    protected readonly options: DockTabStoreOptions,
  ) {
    autoBind(this);
    this.options.autoInit ??= true;

    const { storageKey, autoInit } = this.options;

    if (autoInit && storageKey) {
      const storage = (this.storage = this.dependencies.createStorage(storageKey, {}));

      this.data.replace(storage.get());
      reaction(
        () => this.toJSON(),
        (data) => storage.set(data),
      );
    }
  }

  protected finalizeDataForSave(data: T): T {
    return data;
  }

  protected toJSON(): DockTabStorageState<T> {
    const deepCopy = toJS(this.data);

    deepCopy.forEach((tabData, key) => {
      deepCopy.set(key, this.finalizeDataForSave(tabData));
    });

    return Object.fromEntries<T>(deepCopy);
  }

  protected getAllData() {
    return this.data.toJSON();
  }

  findTabIdFromData(inspecter: (val: T) => any): TabId | undefined {
    for (const [tabId, data] of this.data) {
      if (inspecter(data)) {
        return tabId;
      }
    }

    return undefined;
  }

  isReady(tabId: TabId): boolean {
    return this.getData(tabId) !== undefined;
  }

  getData(tabId: TabId) {
    return this.data.get(tabId);
  }

  setData(tabId: TabId, data: T) {
    this.data.set(tabId, data);
  }

  clearData(tabId: TabId) {
    this.data.delete(tabId);
  }

  @action
  reset() {
    for (const tabId of this.data.keys()) {
      this.clearData(tabId);
    }
    this.storage?.reset();
  }
}
