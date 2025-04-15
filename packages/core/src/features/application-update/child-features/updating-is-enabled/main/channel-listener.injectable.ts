/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { updatingIsEnabledChannel, updatingIsEnabledInitializable } from "../common/token";

const updatingIsEnabledChannelListenerInjectable = getRequestChannelListenerInjectable({
  channel: updatingIsEnabledChannel,
  id: "foobar",
  getHandler: (di) => {
    const updatingIsEnabled = di.inject(updatingIsEnabledInitializable.stateToken);

    return () => updatingIsEnabled;
  },
});

export default updatingIsEnabledChannelListenerInjectable;
