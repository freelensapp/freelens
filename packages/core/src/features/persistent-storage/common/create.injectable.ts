/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { nextTick } from "node:process";
import { loggerInjectionToken } from "@freelensapp/logger";
import { enlistMessageChannelListenerInjectionToken, sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { disposer, isPromiseLike } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { isEqual, kebabCase } from "es-toolkit";
import { reaction } from "mobx";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import getConfigurationFileModelInjectable from "../../../common/get-configuration-file-model/get-configuration-file-model.injectable";
import getBasenameOfPathInjectable from "../../../common/path/get-basename.injectable";
import { persistentStorageIpcChannelPrefixesInjectionToken } from "./channel-prefix";
import { shouldPersistentStorageDisableSyncInIpcListenerInjectionToken } from "./disable-sync";
import { persistStateToConfigInjectionToken } from "./save-to-file";

import type { MessageChannel } from "@freelensapp/messaging";

import type Config from "conf";
import type { Options } from "conf";
import type { IEqualsComparer } from "mobx";

import type { Migrations } from "./migrations.injectable";

export interface PersistentStorage {
  /**
   * This method does the initial synchronous load from disk and then starts writing the state
   * back to disk whenever it changes.
   *
   * Calling it again stops the syncing started by the previous call first, so
   * a storage never syncs more than once.
   */
  loadAndStartSyncing: () => void;

  /**
   * Stops the syncing started by {@link PersistentStorage.loadAndStartSyncing}:
   * the state is no longer written to disk, sent to the other process, or
   * updated from it. Does nothing when the storage is not syncing.
   */
  stopSyncing: () => void;
}

export interface PersistentStorageParams<T extends object = any>
  extends Omit<Options<T & Record<string, unknown>>, "defaults" | "migrations"> {
  /**
   * The model used when there is no stored one yet.
   *
   * Typed as the model itself rather than as conf's `T & Record<string,
   * unknown>`, so that a model declared as an `interface`, which has no
   * implicit index signature, is accepted. It is widened where it reaches conf.
   */
  readonly defaults?: Readonly<T>;
  readonly syncOptions?: {
    readonly fireImmediately?: boolean;
    equals?: IEqualsComparer<T>;
  };
  readonly configName: string;
  readonly migrations?: Migrations;

  /**
   * fromStore is called internally when a child class syncs with the file
   * system.
   *
   * Note: This function **must** be synchronous.
   *
   * @param data the parsed information read from the stored JSON file
   */
  fromStore(data: Partial<T>): void;

  /**
   * toJSON is called when syncing the store to the filesystem. It should
   * produce a JSON serializable object representation of the current state.
   *
   * It is recommended that a round trip is valid. Namely, calling
   * `this.fromStore(this.toJSON())` shouldn't change the state.
   */
  toJSON(): T;
}

export type CreatePersistentStorage = <T extends object>(params: PersistentStorageParams<T>) => PersistentStorage;

const createPersistentStorageInjectable = getInjectable({
  id: "create-persistent-storage",
  instantiate: (di): CreatePersistentStorage => {
    const directoryForUserData = di.inject(directoryForUserDataInjectable);
    const getConfigurationFileModel = di.inject(getConfigurationFileModelInjectable);
    const logger = di.inject(loggerInjectionToken);
    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const ipcChannelPrefixes = di.inject(persistentStorageIpcChannelPrefixesInjectionToken);
    const persistStateToConfig = di.inject(persistStateToConfigInjectionToken);
    const enlistMessageChannelListener = di.inject(enlistMessageChannelListenerInjectionToken);
    const shouldDisableSyncInListener = di.inject(shouldPersistentStorageDisableSyncInIpcListenerInjectionToken);
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return <T extends object>(rawParams: PersistentStorageParams<T>) => {
      const { fromStore, toJSON, syncOptions, migrations, defaults, cwd = directoryForUserData, ...params } = rawParams;
      const displayName = kebabCase(params.configName).toUpperCase();
      let stopCurrentSync: (() => void) | undefined;

      const stopSyncing = () => {
        stopCurrentSync?.();
        stopCurrentSync = undefined;
      };

      const loadAndStartSyncing = () => {
        // A second sync on the same state would send back every change the
        // first one receives, which the other process sends back again.
        stopSyncing();

        logger.info(`[${displayName}]: LOADING ...`);

        const config = getConfigurationFileModel<T & Record<string, unknown>>({
          projectName: "lens",
          cwd,
          migrations: migrations as Options<T & Record<string, unknown>>["migrations"],
          defaults: defaults as Options<T & Record<string, unknown>>["defaults"],
          ...params,
        }) as Config<T>;

        const res = fromStore(config.store);

        if (isPromiseLike(res)) {
          logger.error(
            `${displayName} extends BaseStore<T>'s fromStore method returns a Promise or promise-like object. This is an error and must be fixed.`,
          );
        }

        logger.info(`[${displayName}]: LOADED from ${config.path}`);

        const syncDisposers = disposer();
        let isStopped = false;
        const sendChannel: MessageChannel<T> = {
          id: `${ipcChannelPrefixes.remote}:${config.path}`,
        };
        const receiveChannel: MessageChannel<T> = {
          id: `${ipcChannelPrefixes.local}:${config.path}`,
        };
        const name = getBasenameOfPath(config.path);

        const disableSync = () => syncDisposers();
        const enableSync = () => {
          syncDisposers.push(
            reaction(
              () => toJSON(),
              (model) => {
                persistStateToConfig(config, model);
                sendMessageToChannel(sendChannel, model);
              },
              syncOptions,
            ),
            enlistMessageChannelListener({
              id: "persistent-storage-sync",
              channel: receiveChannel,
              handler: (model) => {
                logger.silly(`[${displayName}]: syncing ${name}`, { model });

                if (shouldDisableSyncInListener) {
                  disableSync();
                }

                // todo: use "resourceVersion" if merge required (to avoid equality checks => better performance)
                if (!isEqual(toJSON(), model)) {
                  fromStore(model);
                }

                if (shouldDisableSyncInListener) {
                  nextTick(() => {
                    if (!isStopped) {
                      enableSync();
                    }
                  });
                }
              },
            }),
          );
        };

        enableSync();

        stopCurrentSync = () => {
          isStopped = true;
          disableSync();
        };
      };

      return {
        loadAndStartSyncing,
        stopSyncing,
      };
    };
  },
});

export default createPersistentStorageInjectable;
