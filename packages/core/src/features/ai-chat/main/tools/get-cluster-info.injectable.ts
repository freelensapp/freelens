/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { z } from "zod";
import executeOnClusterHandlerInjectable from "../../../cluster/execute/main/execute-handler.injectable";

const getClusterInfoSchema = z.object({});

const getClusterInfoToolInjectable = getInjectable({
  id: "ai-chat-tool-get-cluster-info",

  instantiate: (di) => {
    const executeOnCluster = di.inject(executeOnClusterHandlerInjectable);

    return {
      description: "Get cluster overview information: node count, namespace count, and resource summary",
      parameters: getClusterInfoSchema,

      execute: async (_input: z.infer<typeof getClusterInfoSchema>) => {
        // These will use the clusterId set by the chat handler
        const [nodesResponse, namespacesResponse] = await Promise.all([
          executeOnCluster({
            clusterId: "",
            operation: "list",
            resource: { apiVersion: "v1", kind: "Node" },
          }),
          executeOnCluster({
            clusterId: "",
            operation: "list",
            resource: { apiVersion: "v1", kind: "Namespace" },
          }),
        ]);

        const nodes = ((nodesResponse.data as any)?.items as any[]) ?? [];
        const namespaces = ((namespacesResponse.data as any)?.items as any[]) ?? [];

        return {
          nodeCount: nodes.length,
          nodes: nodes.map((node: any) => ({
            name: node?.metadata?.name,
            status: node?.status?.conditions?.find((c: any) => c.type === "Ready")?.status === "True"
              ? "Ready"
              : "NotReady",
            roles: Object.keys(node?.metadata?.labels ?? {})
              .filter((l: string) => l.startsWith("node-role.kubernetes.io/"))
              .map((l: string) => l.replace("node-role.kubernetes.io/", "")),
            kubeletVersion: node?.status?.nodeInfo?.kubeletVersion,
          })),
          namespaceCount: namespaces.length,
          namespaces: namespaces.map((ns: any) => ({
            name: ns?.metadata?.name,
            status: ns?.status?.phase,
          })),
        };
      },
    };
  },
});

export default getClusterInfoToolInjectable;
