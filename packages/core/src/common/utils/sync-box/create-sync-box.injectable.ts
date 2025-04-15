import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { IObservableValue } from "mobx";
import { computed } from "mobx";
import { toJS } from "../toJS";
import { syncBoxChannel } from "./channels";
import type { SyncBox } from "./sync-box-injection-token";
import syncBoxStateInjectable from "./sync-box-state.injectable";

const createSyncBoxInjectable = getInjectable({
  id: "create-sync-box",

  instantiate: (di) => {
    const messageToChannel = di.inject(sendMessageToChannelInjectionToken);
    const getSyncBoxState = (id: string) => di.inject(syncBoxStateInjectable, id);

    return <Value>(id: string, initialValue: Value): SyncBox<Value> => {
      const state = getSyncBoxState(id) as IObservableValue<Value>;

      state.set(initialValue);

      return {
        id,

        value: computed(() => toJS(state.get())),

        set: (value) => {
          state.set(value);

          messageToChannel(syncBoxChannel, { id, value });
        },
      };
    };
  },
});

export default createSyncBoxInjectable;
