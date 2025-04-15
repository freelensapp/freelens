/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeStatusData, PodLogsQuery } from "@freelensapp/kube-object";
import { KubeStatus, Pod, isKubeStatusData } from "@freelensapp/kube-object";
import type {
  DeleteResourceDescriptor,
  DerivedKubeApiOptions,
  KubeApiDependencies,
  ResourceDescriptor,
} from "../kube-api";
import { KubeApi } from "../kube-api";

export class PodApi extends KubeApi<Pod> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: Pod,
    });
  }

  async evict(resource: DeleteResourceDescriptor) {
    await this.checkPreferredVersion();
    const apiUrl = this.formatUrlForNotListing(resource);
    let response: KubeStatusData;

    try {
      response = await this.request.post<KubeStatusData>(`${apiUrl}/eviction`, {
        data: {
          apiVersion: "policy/v1",
          kind: "Eviction",
          metadata: {
            ...resource,
          },
        },
      });
    } catch (err) {
      response = err as KubeStatusData;
    }

    if (isKubeStatusData(response)) {
      const status = new KubeStatus(response);

      if (status.code >= 200 && status.code < 300) {
        return status.getExplanation();
      } else {
        throw status.getExplanation();
      }
    }

    return response;
  }

  async getLogs(params: ResourceDescriptor, query?: PodLogsQuery): Promise<string> {
    const path = `${this.getUrl(params)}/log`;

    const logs = await this.request.get(path, { query });

    if (typeof logs !== "string") {
      return "";
    }

    return logs;
  }
}
