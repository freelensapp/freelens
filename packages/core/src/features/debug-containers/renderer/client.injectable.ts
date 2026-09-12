/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import apiBaseInjectable from "../../../common/k8s-api/api-base.injectable";

import type {
  CreateDebugContainer,
  DebugContainerPermissions,
  DebugContainerReference,
} from "../common/debug-container";

export interface DebugContainerClient {
  permissions(namespace: string): Promise<DebugContainerPermissions>;
  create(request: CreateDebugContainer): Promise<unknown>;
  stop(request: DebugContainerReference): Promise<unknown>;
}

const debugContainerClientInjectable = getInjectable({
  id: "debug-container-client",
  instantiate: (di): DebugContainerClient => {
    const api = di.inject(apiBaseInjectable);

    return {
      permissions: (namespace) => api.post("/debug-containers", { data: { action: "permissions", namespace } }),
      create: (request) => api.post("/debug-containers", { data: { ...request, action: "create" } }),
      stop: (request) => api.post("/debug-containers", { data: { ...request, action: "stop" } }),
    };
  },
});

export default debugContainerClientInjectable;
