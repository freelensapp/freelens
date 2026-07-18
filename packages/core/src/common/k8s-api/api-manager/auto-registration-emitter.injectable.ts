/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import EventEmitter from "node:events";
import { getInjectable } from "@ogre-tools/injectable";

import type { KubeApi } from "@freelensapp/kube-api";

import type TypedEventEmitter from "typed-emitter";

export type LegacyAutoRegistration = {
  kubeApi: (api: KubeApi<any, any>) => void;
};

/**
 * This is used to remove dependency cycles from auto registering of instances
 *
 * - Custom Resource Definitions get their own registered store (will need in the future)
 * - All KubeApi's get auto registered (this should be changed in the future)
 */
const autoRegistrationEmitterInjectable = getInjectable({
  id: "auto-registration-emitter",
  instantiate: (): TypedEventEmitter<LegacyAutoRegistration> =>
    new EventEmitter() as unknown as TypedEventEmitter<LegacyAutoRegistration>,
});

export default autoRegistrationEmitterInjectable;
