/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { initialSystemThemeTypeChannel } from "../common/channels";

import type { RequestChannelHandler } from "@freelensapp/messaging";

export type RequestInitialSystemThemeType = RequestChannelHandler<typeof initialSystemThemeTypeChannel>;

const requestInitialSystemThemeTypeInjectable = getInjectable({
  id: "request-initial-system-theme-type",
  instantiate: (di): RequestInitialSystemThemeType => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return () => requestFromChannel(initialSystemThemeTypeChannel);
  },
});

export default requestInitialSystemThemeTypeInjectable;
