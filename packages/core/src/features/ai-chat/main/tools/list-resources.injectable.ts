/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { z } from "zod";
import executeOnClusterHandlerInjectable from "../../../cluster/execute/main/execute-handler.injectable";

const listResourcesSchema = z.object({
  kind: z.string().describe("Kubernetes resource kind, e.g., Pod, Deployment, Service, Node, Namespace"),
  apiVersion: z
    .string()
    .optional()
    .describe('API version, e.g., "v1", "apps/v1". Defaults to "v1" for core resources.'),
  namespace: z.string().optional().describe("Namespace to filter by. Omit for cluster-scoped or all namespaces."),
  labelSelector: z.string().optional().describe("Label selector to filter resources, e.g., 'app=nginx'"),
});

/**
 * Maps common resource kinds to their apiVersion.
 */
const kindToApiVersion: Record<string, string> = {
  Pod: "v1",
  Service: "v1",
  Node: "v1",
  Namespace: "v1",
  ConfigMap: "v1",
  Secret: "v1",
  Event: "v1",
  PersistentVolume: "v1",
  PersistentVolumeClaim: "v1",
  ServiceAccount: "v1",
  Deployment: "apps/v1",
  StatefulSet: "apps/v1",
  DaemonSet: "apps/v1",
  ReplicaSet: "apps/v1",
  Ingress: "networking.k8s.io/v1",
  NetworkPolicy: "networking.k8s.io/v1",
  Job: "batch/v1",
  CronJob: "batch/v1",
  HorizontalPodAutoscaler: "autoscaling/v2",
  StorageClass: "storage.k8s.io/v1",
};

const listResourcesToolInjectable = getInjectable({
  id: "ai-chat-tool-list-resources",

  instantiate: (di) => {
    const executeOnCluster = di.inject(executeOnClusterHandlerInjectable);

    return {
      description: "List Kubernetes resources of a given kind, optionally filtered by namespace and label selector",
      parameters: listResourcesSchema,

      execute: async ({ kind, apiVersion, namespace, labelSelector }: z.infer<typeof listResourcesSchema>) => {
        const resolvedApiVersion = apiVersion || kindToApiVersion[kind] || "v1";

        const response = await executeOnCluster({
          clusterId: "",
          operation: "list",
          resource: {
            apiVersion: resolvedApiVersion,
            kind,
            namespace,
            labelSelector,
          },
        });

        if (!response.success) {
          return { error: response.error?.message ?? "Failed to list resources" };
        }

        const data = response.data as { items?: unknown[] } | undefined;
        const items = data?.items ?? [];

        // Return a concise summary to avoid overwhelming the context window
        return {
          kind,
          namespace: namespace ?? "all namespaces",
          count: items.length,
          items: items.map((item: any) => ({
            name: item?.metadata?.name,
            namespace: item?.metadata?.namespace,
            status: item?.status?.phase ?? item?.status?.conditions?.[0]?.type,
            createdAt: item?.metadata?.creationTimestamp,
            labels: item?.metadata?.labels,
          })),
        };
      },
    };
  },
});

export default listResourcesToolInjectable;
