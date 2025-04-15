import assert from "assert";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import { syncBoxInitialValueChannel } from "../../../common/utils/sync-box/channels";
import { syncBoxInjectionToken } from "../../../common/utils/sync-box/sync-box-injection-token";
import createSyncBoxStateInjectable from "../../../common/utils/sync-box/sync-box-state.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../../before-frame-starts/tokens";

const provideInitialValuesForSyncBoxesInjectable = getInjectable({
  id: "provide-initial-values-for-sync-boxes",

  instantiate: (di) => ({
    run: async () => {
      const requestFromChannel = di.inject(requestFromChannelInjectionToken);
      const syncBoxes = di.injectMany(syncBoxInjectionToken);
      const initialValues = await requestFromChannel(syncBoxInitialValueChannel);

      runInAction(() => {
        for (const { id, value } of initialValues) {
          const syncBox = syncBoxes.find((box) => box.id === id);

          assert(syncBox);
          di.inject(createSyncBoxStateInjectable, syncBox.id).set(value);
        }
      });
    },
  }),

  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default provideInitialValuesForSyncBoxesInjectable;
