/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ChannelRequester } from "@freelensapp/messaging";
import { getInjectionToken } from "@ogre-tools/injectable";
import type { activateClusterChannel, deactivateClusterChannel } from "./channels";

export type RequestClusterActivation = ChannelRequester<typeof activateClusterChannel>;

export const requestClusterActivationInjectionToken = getInjectionToken<RequestClusterActivation>({
  id: "request-cluster-activation-token",
});

export type RequestClusterDeactivation = ChannelRequester<typeof deactivateClusterChannel>;

export const requestClusterDeactivationInjectionToken = getInjectionToken<RequestClusterDeactivation>({
  id: "request-cluster-deactivation-token",
});
