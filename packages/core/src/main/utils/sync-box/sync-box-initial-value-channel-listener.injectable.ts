/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { syncBoxInitialValueChannel } from "../../../common/utils/sync-box/channels";
import { syncBoxInjectionToken } from "../../../common/utils/sync-box/sync-box-injection-token";

const syncBoxInitialValueChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "sync-box-initial-value-channel-listener",
  channel: syncBoxInitialValueChannel,
  getHandler: (di) => {
    const syncBoxes = di.injectMany(syncBoxInjectionToken);

    return () =>
      syncBoxes.map((box) => ({
        id: box.id,
        value: box.value.get(),
      }));
  },
});

export default syncBoxInitialValueChannelListenerInjectable;
