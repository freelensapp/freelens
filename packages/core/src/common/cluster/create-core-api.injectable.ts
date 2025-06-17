/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CoreV1Api } from "@freelensapp/kubernetes-client-node";
import { getInjectable } from "@ogre-tools/injectable";

import type { KubeConfig } from "@freelensapp/kubernetes-client-node";

export type CreateCoreApi = (config: KubeConfig) => CoreV1Api;

const createCoreApiInjectable = getInjectable({
  id: "create-core-api",
  instantiate: (): CreateCoreApi => (config) => config.makeApiClient(CoreV1Api),
});

export default createCoreApiInjectable;
