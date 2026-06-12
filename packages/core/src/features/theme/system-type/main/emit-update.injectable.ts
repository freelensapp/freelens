/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { systemThemeTypeUpdateChannel } from "../common/channels";

import type { SystemThemeType } from "../common/channels";

const emitSystemThemeTypeUpdateInjectable = getInjectable({
  id: "emit-system-theme-type-update",
  instantiate: (di) => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return (type: SystemThemeType) => sendMessageToChannel(systemThemeTypeUpdateChannel, type);
  },
});

export default emitSystemThemeTypeUpdateInjectable;
