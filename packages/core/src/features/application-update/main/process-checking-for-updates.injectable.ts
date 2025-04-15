/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import { getCurrentDateTime } from "../../../common/utils/date/get-current-date-time";
import discoveredUpdateVersionInjectable from "../common/discovered-update-version.injectable";
import selectedUpdateChannelInjectable from "../common/selected-update-channel.injectable";
import updatesAreBeingDiscoveredInjectable from "../common/updates-are-being-discovered.injectable";
import checkForUpdatesStartingFromChannelInjectable from "./check-for-updates/check-for-updates-starting-from-channel.injectable";
import downloadUpdateInjectable from "./download-update/download-update.injectable";

const processCheckingForUpdatesInjectable = getInjectable({
  id: "process-checking-for-updates",

  instantiate: (di) => {
    const downloadUpdate = di.inject(downloadUpdateInjectable);
    const selectedUpdateChannel = di.inject(selectedUpdateChannelInjectable);
    const checkingForUpdatesState = di.inject(updatesAreBeingDiscoveredInjectable);
    const discoveredVersionState = di.inject(discoveredUpdateVersionInjectable);
    const checkForUpdatesStartingFromChannel = di.inject(checkForUpdatesStartingFromChannelInjectable);
    const emitEvent = di.inject(emitAppEventInjectable);

    return async (source: string) => {
      emitEvent({
        name: "app",
        action: "checking-for-updates",
        params: { currentDateTime: getCurrentDateTime(), source },
      });

      runInAction(() => {
        checkingForUpdatesState.set(true);
      });

      const result = await checkForUpdatesStartingFromChannel(selectedUpdateChannel.value.get());

      if (!result.updateWasDiscovered) {
        runInAction(() => {
          discoveredVersionState.set(null);
          checkingForUpdatesState.set(false);
        });

        return { updateIsReadyToBeInstalled: false };
      }

      const { version, actualUpdateChannel } = result;

      const previouslyDiscovered = discoveredVersionState.value.get();

      if (version === previouslyDiscovered?.version) {
        runInAction(() => {
          checkingForUpdatesState.set(false);
        });

        return { updateIsReadyToBeInstalled: true };
      }

      emitEvent({
        name: "app",
        action: "update-was-discovered",
        params: { version, currentDateTime: getCurrentDateTime() },
      });

      runInAction(() => {
        discoveredVersionState.set({
          version,
          updateChannel: actualUpdateChannel,
        });

        checkingForUpdatesState.set(false);
      });

      const { downloadWasSuccessful } = await downloadUpdate();

      return { updateIsReadyToBeInstalled: downloadWasSuccessful };
    };
  },
});

export default processCheckingForUpdatesInjectable;
