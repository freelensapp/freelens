/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { withTimeout } from "../common/fetch/timeout-controller";
import lensFetchInjectable, { type LensRequestInit } from "./fetch/lens-fetch.injectable";

export interface K8sRequestInit extends LensRequestInit {
  timeout?: number;
}

export interface ClusterData {
  readonly id: string;
}

export type K8sRequest = (cluster: ClusterData, pathnameAndQuery: string, init?: K8sRequestInit) => Promise<unknown>;

const k8sRequestInjectable = getInjectable({
  id: "k8s-request",

  instantiate: (di): K8sRequest => {
    const lensFetch = di.inject(lensFetchInjectable);

    return async (cluster, pathnameAndQuery, { timeout = 30_000, signal, ...init } = {}) => {
      const controller = timeout ? withTimeout(timeout) : undefined;

      if (controller && signal) {
        signal.addEventListener("abort", () => controller.abort());
      }

      const response = await lensFetch(`/${cluster.id}${pathnameAndQuery}`, {
        ...init,
        signal: controller?.signal ?? (signal as any),
      });

      if (response.status < 200 || response.status >= 300) {
        // The proxy explains transport failures in the body, e.g. a failing
        // credential plugin: keep it, and expose the status so that the callers
        // can classify the failure (see isRequestError).
        const body = (await response.text().catch(() => "")).trim();
        const reason = body || response.statusText;

        throw Object.assign(
          new Error(`Failed to ${init.method ?? "get"} ${pathnameAndQuery} for clusterId=${cluster.id}: ${reason}`, {
            cause: response,
          }),
          { statusCode: response.status, error: reason },
        );
      }

      return response.json();
    };
  },
});

export default k8sRequestInjectable;
