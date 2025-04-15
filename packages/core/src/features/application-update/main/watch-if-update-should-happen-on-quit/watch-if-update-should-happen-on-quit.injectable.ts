/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getStartableStoppable } from "@freelensapp/startable-stoppable";
import { getInjectable } from "@ogre-tools/injectable";
import { autorun } from "mobx";
import setUpdateOnQuitInjectable from "../../../../main/electron-app/features/set-update-on-quit.injectable";
import discoveredUpdateVersionInjectable from "../../common/discovered-update-version.injectable";
import selectedUpdateChannelInjectable from "../../common/selected-update-channel.injectable";
import type { ReleaseChannel, UpdateChannel } from "../../common/update-channels";

const watchIfUpdateShouldHappenOnQuitInjectable = getInjectable({
  id: "watch-if-update-should-happen-on-quit",

  instantiate: (di) => {
    const setUpdateOnQuit = di.inject(setUpdateOnQuitInjectable);
    const selectedUpdateChannel = di.inject(selectedUpdateChannelInjectable);
    const discoveredVersionState = di.inject(discoveredUpdateVersionInjectable);

    return getStartableStoppable("watch-if-update-should-happen-on-quit", () =>
      autorun(() => {
        const sufficientlyStableUpdateChannels = getSufficientlyStableUpdateChannels(selectedUpdateChannel.value.get());
        const updateIsDiscoveredFromChannel = discoveredVersionState.value.get()?.updateChannel;

        setUpdateOnQuit(
          updateIsDiscoveredFromChannel
            ? sufficientlyStableUpdateChannels.includes(updateIsDiscoveredFromChannel.id)
            : false,
        );
      }),
    );
  },
});

const getSufficientlyStableUpdateChannels = (updateChannel: UpdateChannel): ReleaseChannel[] => {
  if (!updateChannel.moreStableUpdateChannel) {
    return [updateChannel.id];
  }

  return [updateChannel.id, ...getSufficientlyStableUpdateChannels(updateChannel.moreStableUpdateChannel)];
};

export default watchIfUpdateShouldHappenOnQuitInjectable;
