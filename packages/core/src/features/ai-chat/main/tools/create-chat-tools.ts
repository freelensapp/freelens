/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { tool } from "ai";
import { z } from "zod";

import type { ExecuteOnClusterRequest, ExecuteOnClusterResponse } from "../../../cluster/execute/common/types";

type ExecuteOnCluster = (request: ExecuteOnClusterRequest) => Promise<ExecuteOnClusterResponse>;

export interface ChatToolContext {
  clusterId: string;
  clusterName: string;
  executeOnCluster: ExecuteOnCluster;
}

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

function resolveApiVersion(kind: string): string {
  return kindToApiVersion[kind] || "v1";
}

// ── Tool schemas ────────────────────────────────────────────────────

const listResourcesSchema = z.object({
  kind: z.string().describe("Kubernetes resource kind, e.g., Pod, Deployment, Service, Node, Namespace"),
  apiVersion: z
    .string()
    .optional()
    .describe('API version, e.g., "v1", "apps/v1". Defaults to "v1" for core resources.'),
  namespace: z.string().optional().describe("Namespace to filter by. Omit for cluster-scoped or all namespaces."),
  labelSelector: z.string().optional().describe("Label selector to filter resources, e.g., 'app=nginx'"),
});

const getResourceSchema = z.object({
  kind: z.string().describe("Kubernetes resource kind, e.g., Pod, Deployment, Service"),
  apiVersion: z.string().optional().describe('API version, e.g., "v1", "apps/v1". Defaults to "v1".'),
  name: z.string().describe("Exact resource name"),
  namespace: z.string().optional().describe("Resource namespace. Required for namespaced resources."),
});

const getClusterInfoSchema = z.object({});

const getEventsSchema = z.object({
  namespace: z.string().optional().describe("Namespace to filter events. Omit for all namespaces."),
  involvedObjectName: z.string().optional().describe("Filter events by the name of the involved resource"),
  involvedObjectKind: z.string().optional().describe("Filter events by the kind of the involved resource"),
});

// ── Tool factories ──────────────────────────────────────────────────

function createListResources(ctx: ChatToolContext) {
  return tool({
    description: "List Kubernetes resources of a given kind, optionally filtered by namespace and label selector",
    inputSchema: listResourcesSchema,
    execute: async (input) => {
      const resolvedApiVersion = input.apiVersion || resolveApiVersion(input.kind);
      const response = await ctx.executeOnCluster({
        clusterId: ctx.clusterId,
        operation: "list",
        resource: {
          apiVersion: resolvedApiVersion,
          kind: input.kind,
          namespace: input.namespace,
          labelSelector: input.labelSelector,
        },
      });

      if (!response.success) {
        return { error: response.error?.message ?? "Failed to list resources" };
      }

      const items = ((response.data as any)?.items as any[]) ?? [];

      return {
        kind: input.kind,
        namespace: input.namespace ?? "all namespaces",
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
  });
}

function createGetResource(ctx: ChatToolContext) {
  return tool({
    description: "Get a specific Kubernetes resource by name, kind, and namespace",
    inputSchema: getResourceSchema,
    execute: async (input) => {
      const resolvedApiVersion = input.apiVersion || resolveApiVersion(input.kind);
      const response = await ctx.executeOnCluster({
        clusterId: ctx.clusterId,
        operation: "get",
        resource: {
          apiVersion: resolvedApiVersion,
          kind: input.kind,
          name: input.name,
          namespace: input.namespace,
        },
      });

      if (!response.success) {
        if (response.error?.code === 404) {
          return {
            error: `Resource ${input.kind}/${input.name} not found${input.namespace ? ` in namespace ${input.namespace}` : ""}`,
          };
        }

        return { error: response.error?.message ?? "Failed to get resource" };
      }

      const resource = response.data as any;

      if (input.kind === "Secret") {
        return {
          kind: input.kind,
          name: resource?.metadata?.name,
          namespace: resource?.metadata?.namespace,
          type: resource?.type,
          labels: resource?.metadata?.labels,
          dataKeys: resource?.data ? Object.keys(resource.data) : [],
          note: "Secret values are redacted for security",
        };
      }

      return resource;
    },
  });
}

function createGetClusterInfo(ctx: ChatToolContext) {
  return tool({
    description: "Get cluster overview information: node count, namespace count, and resource summary",
    inputSchema: getClusterInfoSchema,
    execute: async () => {
      const [nodesRes, nsRes] = await Promise.all([
        ctx.executeOnCluster({
          clusterId: ctx.clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Node" },
        }),
        ctx.executeOnCluster({
          clusterId: ctx.clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Namespace" },
        }),
      ]);

      const nodes = ((nodesRes.data as any)?.items as any[]) ?? [];
      const namespaces = ((nsRes.data as any)?.items as any[]) ?? [];

      return {
        clusterName: ctx.clusterName,
        nodeCount: nodes.length,
        nodes: nodes.map((n: any) => ({
          name: n?.metadata?.name,
          status:
            n?.status?.conditions?.find((c: any) => c.type === "Ready")?.status === "True"
              ? "Ready"
              : "NotReady",
          kubeletVersion: n?.status?.nodeInfo?.kubeletVersion,
        })),
        namespaceCount: namespaces.length,
        namespaces: namespaces.map((ns: any) => ns?.metadata?.name),
      };
    },
  });
}

function createGetEvents(ctx: ChatToolContext) {
  return tool({
    description: "Get recent Kubernetes events, optionally filtered by namespace or involved resource",
    inputSchema: getEventsSchema,
    execute: async (input) => {
      const fieldSelectors: string[] = [];

      if (input.involvedObjectName) {
        fieldSelectors.push(`involvedObject.name=${input.involvedObjectName}`);
      }

      if (input.involvedObjectKind) {
        fieldSelectors.push(`involvedObject.kind=${input.involvedObjectKind}`);
      }

      const response = await ctx.executeOnCluster({
        clusterId: ctx.clusterId,
        operation: "list",
        resource: {
          apiVersion: "v1",
          kind: "Event",
          namespace: input.namespace,
          fieldSelector: fieldSelectors.length > 0 ? fieldSelectors.join(",") : undefined,
        },
      });

      if (!response.success) {
        return { error: response.error?.message ?? "Failed to get events" };
      }

      const events = ((response.data as any)?.items as any[]) ?? [];
      const sorted = events
        .sort((a: any, b: any) => {
          const tA = new Date(a?.lastTimestamp ?? a?.metadata?.creationTimestamp ?? 0).getTime();
          const tB = new Date(b?.lastTimestamp ?? b?.metadata?.creationTimestamp ?? 0).getTime();

          return tB - tA;
        })
        .slice(0, 50);

      return {
        count: events.length,
        events: sorted.map((e: any) => ({
          type: e?.type,
          reason: e?.reason,
          message: e?.message,
          involvedObject: `${e?.involvedObject?.kind}/${e?.involvedObject?.name}`,
          count: e?.count,
          lastTimestamp: e?.lastTimestamp,
        })),
      };
    },
  });
}

// ── Public factory ──────────────────────────────────────────────────

/**
 * Creates the full set of AI chat tools bound to a specific cluster context.
 * Add new tools here — each tool gets the same ChatToolContext.
 */
export function createChatTools(ctx: ChatToolContext) {
  return {
    listResources: createListResources(ctx),
    getResource: createGetResource(ctx),
    getClusterInfo: createGetClusterInfo(ctx),
    getEvents: createGetEvents(ctx),
  };
}
