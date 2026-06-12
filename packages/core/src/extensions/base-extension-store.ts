/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getLegacyGlobalDiForExtensionApi } from "@freelensapp/legacy-global-di";
import { getOrInsertWith } from "@freelensapp/utilities";
import assert from "assert";
import * as path from "path";
import directoryForUserDataInjectable from "../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import createPersistentStorageInjectable, {
  type PersistentStorage,
} from "../features/persistent-storage/common/create.injectable";

import type { Options } from "conf";

import type { Migrations } from "../features/persistent-storage/common/migrations.injectable";
import type { PersistentStorageParams } from "./common-api/stores";
import type { LensExtension } from "./lens-extension";

export interface ExtensionStoreParams<T extends object>
  extends Omit<PersistentStorageParams<T>, "migrations" | "cwd" | "fromStore" | "toJSON"> {
  migrations?: Options<T>["migrations"];
  cwd?: string;
}

export abstract class BaseExtensionStore<M extends object = any> {
  private static readonly instances = new WeakMap<typeof BaseExtensionStore, object>();

  static createInstance<S extends BaseExtensionStore<M>, M extends object = any, A extends any[] = []>(...args: A): S {
    return getOrInsertWith(BaseExtensionStore.instances, this, () => new (this as any)(...args));
  }

  static getInstance<S extends BaseExtensionStore<M>, M extends object = any>(strict?: true): S;
  static getInstance<S extends BaseExtensionStore<M>, M extends object = any>(strict: false): S | undefined;
  static getInstance<S extends BaseExtensionStore<M>, M extends object = any>(strict = true): S | undefined {
    if (!BaseExtensionStore.instances.has(this) && strict) {
      throw new TypeError(`instance of ${this.name} is not created`);
    }

    return BaseExtensionStore.instances.get(this) as S | undefined;
  }

  static getInstanceOrCreate<S extends BaseExtensionStore<M>, M extends object = any, A extends any[] = []>(
    ...args: A
  ): S {
    try {
      return this.getInstance<S, M>();
    } catch (e) {
      if (e instanceof TypeError) {
        return this.createInstance<S, M, A>(...args);
      } else {
        throw e;
      }
    }
  }

  protected persistentStorage?: PersistentStorage;
  private readonly dependencies = (() => {
    const di = getLegacyGlobalDiForExtensionApi();

    return {
      createPersistentStorage: di.inject(createPersistentStorageInjectable),
      directoryForUserData: di.inject(directoryForUserDataInjectable),
    } as const;
  })();

  constructor(protected readonly rawParams: ExtensionStoreParams<M>) {}

  static resetInstance() {
    BaseExtensionStore.instances.delete(this);
  }

  protected extension?: LensExtension;

  loadExtension(extension: LensExtension) {
    this.extension = extension;
    const {
      projectVersion = this.extension.version,
      cwd: _cwd, // This is ignored to maintain backwards compatibility
      migrations = {},
      ...params
    } = this.rawParams;

    this.persistentStorage = this.dependencies.createPersistentStorage({
      ...params,
      cwd: this.cwd(),
      projectVersion,
      migrations: migrations as Migrations,
      fromStore: (data) => this.fromStore(data),
      toJSON: () => this.toJSON(),
    });

    this.persistentStorage.loadAndStartSyncing();
  }

  /**
   * @deprecated Never use this method. Instead call {@link Common.Store.ExtensionStore.loadExtension}
   */
  load() {
    this.persistentStorage?.loadAndStartSyncing();
  }

  protected cwd() {
    assert(this.extension, "cwd can only be called in loadExtension");

    return (
      this.rawParams.cwd ??
      path.join(this.dependencies.directoryForUserData, "extension-store", this.extension.storeName)
    );
  }

  abstract fromStore(data: Partial<M>): void;
  abstract toJSON(): M;
}
