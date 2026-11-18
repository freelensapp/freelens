/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isRequestError } from "@freelensapp/utilities";
import { getInjectionToken } from "@ogre-tools/injectable";

import type { CoreV1Api } from "@kubernetes/client-node";

export interface PrometheusService extends PrometheusServiceInfo {
  kind: string;
}

export interface PrometheusServiceInfo {
  namespace: string;
  service: string;
  port: number;
  /**
   * Options that the provider found with the service and that are added to the options of every query sent to it,
   * such as the name of the cluster to filter on when a metrics backend holds the series of several clusters.
   */
  queryOpts?: Record<string, string>;
}

/**
 * Builds the PromQL of a query from its options.
 *
 * Returns `undefined` for a query the provider knows but has no metric for: the query is not sent, and its result
 * is empty, the same as a query whose series do not exist. A name the provider does not know throws.
 */
export type GetPrometheusQuery = (opts: Record<string, string>, queryName: string) => string | undefined;

export interface PrometheusProvider {
  readonly kind: string;
  readonly name: string;
  readonly isConfigurable: boolean;
  /**
   * A fallback provider is tried by Auto Detect only after every other provider, so that it is chosen only when no
   * other provider found a service.
   */
  readonly isFallback?: boolean;

  getQuery: GetPrometheusQuery;
  getPrometheusService(client: CoreV1Api): Promise<PrometheusService>;
}

export interface CreatePrometheusProviderOpts {
  readonly kind: string;
  readonly name: string;
  readonly isConfigurable: boolean;
  readonly isFallback?: boolean;

  getQuery: GetPrometheusQuery;
  getService(client: CoreV1Api): Promise<PrometheusServiceInfo>;
}

export const createPrometheusProvider = ({
  getService,
  ...opts
}: CreatePrometheusProviderOpts): PrometheusProvider => ({
  ...opts,
  getPrometheusService: async (client) => {
    try {
      return {
        kind: opts.kind,
        ...(await getService(client)),
      };
    } catch (error) {
      throw new Error(`Failed to find Prometheus provider for "${opts.name}"`, { cause: error });
    }
  },
});

export async function findFirstNamespacedService(
  client: CoreV1Api,
  ...selectors: string[]
): Promise<PrometheusServiceInfo> {
  try {
    for (const labelSelector of selectors) {
      const {
        items: [service],
      } = await client.listServiceForAllNamespaces({ labelSelector });

      if (service?.metadata?.namespace && service.metadata.name && service.spec?.ports) {
        return {
          namespace: service.metadata.namespace,
          service: service.metadata.name,
          port: service.spec.ports[0].port,
        };
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to list services in all namespaces: ${isRequestError(error) ? error.response?.body.message : error}`,
    );
  }

  throw new Error(`No service found from any namespace`);
}

export async function findNamespacedService(
  client: CoreV1Api,
  name: string,
  namespace: string,
): Promise<PrometheusServiceInfo> {
  try {
    const service = await client.readNamespacedService({ name, namespace });

    if (!service.metadata?.namespace || !service.metadata.name || !service.spec?.ports) {
      throw new Error(`Service found in namespace="${namespace}" did not have required information`);
    }

    return {
      namespace: service.metadata.namespace,
      service: service.metadata.name,
      port: service.spec.ports[0].port,
    };
  } catch (error) {
    throw new Error(
      `Failed to list services in namespace="${namespace}": ${
        isRequestError(error) ? error.response?.body.message : error
      }`,
    );
  }
}

export interface BytesSentArgs {
  rateAccuracy: string;
  ingress: string;
  namespace: string;
  statuses: string;
}

export function bytesSent({ rateAccuracy, ingress, namespace, statuses }: BytesSentArgs): string {
  return `sum(rate(nginx_ingress_controller_bytes_sent_sum{ingress="${ingress}",namespace="${namespace}",status=~"${statuses}"}[${rateAccuracy}])) by (ingress, namespace)`;
}

/**
 * Only include the node label selector when `opts.nodes` is present.
 * For metric references that have no other label matchers, use this version
 * which wraps the selector in `{...}` braces (no leading comma).
 *
 * @example
 *   `node_memory_...${nodeFilter(opts, "kubernetes_node")}` // → node_memory_...{kubernetes_node=~"n1|n2"}
 *   `node_memory_...${nodeFilter(opts, "kubernetes_node")}` // → node_memory_... (when opts.nodes is empty)
 */
export function nodeFilter(opts: Record<string, string>, label: string): string {
  return opts.nodes ? `{${label}=~"${opts.nodes}"}` : "";
}

/**
 * For metric references that already have other label matchers inside `{...}`,
 * use this version which adds a leading comma.
 *
 * @example
 *   `kube_node_status_capacity{resource="memory"${nodeFilterAdditive(opts, "node")}}`
 *   // → kube_node_status_capacity{resource="memory",node=~"n1|n2"}
 *   // → kube_node_status_capacity{resource="memory"} (when opts.nodes is empty)
 */
export function nodeFilterAdditive(opts: Record<string, string>, label: string): string {
  return opts.nodes ? `,${label}=~"${opts.nodes}"` : "";
}

export const prometheusProviderInjectionToken = getInjectionToken<PrometheusProvider>({
  id: "prometheus-provider",
});
