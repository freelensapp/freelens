/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { PodLogsQuery } from "@freelensapp/kube-object";
import { podApiInjectable } from "@freelensapp/kube-api-specifics";
import type { ResourceDescriptor } from "@freelensapp/kube-api";

export type CallForLogs = (params: ResourceDescriptor, query?: PodLogsQuery) => Promise<string>;

const callForLogsInjectable = getInjectable({
  id: "call-for-logs",
  instantiate: (di): CallForLogs => {
    const api = di.inject(podApiInjectable);

    return (params, query) => api.getLogs(params, query);
  },
});

export default callForLogsInjectable;
