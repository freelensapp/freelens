/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ChannelRequester } from "@freelensapp/messaging";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { getHelmReleaseChannel } from "../common/channels";

export type RequestHelmRelease = ChannelRequester<typeof getHelmReleaseChannel>;

const requestHelmReleaseInjectable = getInjectable({
  id: "request-helm-release",
  instantiate: (di): RequestHelmRelease => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (args) => requestFromChannel(getHelmReleaseChannel, args);
  },
});

export default requestHelmReleaseInjectable;
