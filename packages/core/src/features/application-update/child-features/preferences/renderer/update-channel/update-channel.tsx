/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { pipeline } from "@ogre-tools/fp";
import { withInjectables } from "@ogre-tools/injectable-react";
import { map, toPairs } from "lodash/fp";
import { observer } from "mobx-react";
import React from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import type { SelectedUpdateChannel } from "../../../../common/selected-update-channel.injectable";
import selectedUpdateChannelInjectable from "../../../../common/selected-update-channel.injectable";
import { updateChannels } from "../../../../common/update-channels";

interface Dependencies {
  selectedUpdateChannel: SelectedUpdateChannel;
}

const updateChannelOptions = pipeline(
  toPairs(updateChannels),

  map(([, channel]) => ({
    value: channel.id,
    label: channel.label,
  })),
);

const NonInjectedUpdateChannel = observer(({ selectedUpdateChannel }: Dependencies) => (
  <section id="update-channel">
    <SubTitle title="Update Channel" />
    <Select
      id="update-channel-input"
      options={updateChannelOptions}
      value={selectedUpdateChannel.value.get().id}
      onChange={(selected) => selectedUpdateChannel.setValue(selected?.value)}
      themeName="lens"
    />
  </section>
));

export const UpdateChannel = withInjectables<Dependencies>(
  NonInjectedUpdateChannel,

  {
    getProps: (di) => ({
      selectedUpdateChannel: di.inject(selectedUpdateChannelInjectable),
    }),
  },
);
