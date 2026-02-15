/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { z } from "zod";
import executeOnClusterHandlerInjectable from "../../../cluster/execute/main/execute-handler.injectable";

const getResourceSchema = z.object({
  kind: z.string().describe("Kubernetes resource kind, e.g., Pod, Deployment, Service"),
  apiVersion: z.string().optional().describe('API version, e.g., "v1", "apps/v1". Defaults to "v1".'),
  name: z.string().describe("Exact resource name"),
  namespace: z.string().optional().describe("Resource namespace. Required for namespaced resources."),
});

const kindToApiVersion: Record<string, string> = {
  Pod: "v1",
  Service: "v1",
  Node: "v1",
  Namespace: "v1",
  ConfigMap: "v1",
  Secret: "v1",
  Event: "v1",
  Deployment: "apps/v1",
  StatefulSet: "apps/v1",
  DaemonSet: "apps/v1",
  ReplicaSet: "apps/v1",
  Ingress: "networking.k8s.io/v1",
  Job: "batch/v1",
  CronJob: "batch/v1",
};

const getResourceToolInjectable = getInjectable({
  id: "ai-chat-tool-get-resource",

  instantiate: (di) => {
    const executeOnCluster = di.inject(executeOnClusterHandlerInjectable);

    return {
      description: "Get a specific Kubernetes resource by name, kind, and namespace",
      parameters: getResourceSchema,

      execute: async ({ kind, apiVersion, name, namespace }: z.infer<typeof getResourceSchema>) => {
        const resolvedApiVersion = apiVersion || kindToApiVersion[kind] || "v1";

        const response = await executeOnCluster({
          clusterId: "", // Will be set by the chat handler
          operation: "get",
          resource: {
            apiVersion: resolvedApiVersion,
            kind,
            name,
            namespace,
          },
        });

        if (!response.success) {
          if (response.error?.code === 404) {
            return { error: `Resource ${kind}/${name} not found${namespace ? ` in namespace ${namespace}` : ""}` };
          }

          return { error: response.error?.message ?? "Failed to get resource" };
        }

        const resource = response.data as any;

        // For Secrets, only return metadata — never expose secret values
        if (kind === "Secret") {
          return {
            kind,
            name: resource?.metadata?.name,
            namespace: resource?.metadata?.namespace,
            type: resource?.type,
            labels: resource?.metadata?.labels,
            annotations: resource?.metadata?.annotations,
            createdAt: resource?.metadata?.creationTimestamp,
            dataKeys: resource?.data ? Object.keys(resource.data) : [],
            note: "Secret values are redacted for security",
          };
        }

        return resource;
      },
    };
  },
});

export default getResourceToolInjectable;
