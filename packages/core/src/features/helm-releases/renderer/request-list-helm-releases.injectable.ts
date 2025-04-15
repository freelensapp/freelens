/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ChannelRequester } from "@freelensapp/messaging";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { listHelmReleasesChannel } from "../common/channels";

export type RequestListHelmReleases = ChannelRequester<typeof listHelmReleasesChannel>;

const requestListHelmReleasesInjectable = getInjectable({
  id: "request-list-helm-releases",
  instantiate: (di): RequestListHelmReleases => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (args) => requestFromChannel(listHelmReleasesChannel, args);
  },
});

export default requestListHelmReleasesInjectable;
