/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { z } from "zod";
import executeOnClusterHandlerInjectable from "../../../cluster/execute/main/execute-handler.injectable";

const getEventsSchema = z.object({
  namespace: z.string().optional().describe("Namespace to filter events. Omit for all namespaces."),
  involvedObjectName: z.string().optional().describe("Filter events by the name of the involved resource"),
  involvedObjectKind: z.string().optional().describe("Filter events by the kind of the involved resource"),
});

const getEventsToolInjectable = getInjectable({
  id: "ai-chat-tool-get-events",

  instantiate: (di) => {
    const executeOnCluster = di.inject(executeOnClusterHandlerInjectable);

    return {
      description: "Get recent Kubernetes events, optionally filtered by namespace or involved resource",
      parameters: getEventsSchema,

      execute: async ({ namespace, involvedObjectName, involvedObjectKind }: z.infer<typeof getEventsSchema>) => {
        const fieldSelectors: string[] = [];

        if (involvedObjectName) {
          fieldSelectors.push(`involvedObject.name=${involvedObjectName}`);
        }

        if (involvedObjectKind) {
          fieldSelectors.push(`involvedObject.kind=${involvedObjectKind}`);
        }

        const response = await executeOnCluster({
          clusterId: "", // Will be set by the chat handler
          operation: "list",
          resource: {
            apiVersion: "v1",
            kind: "Event",
            namespace,
            fieldSelector: fieldSelectors.length > 0 ? fieldSelectors.join(",") : undefined,
          },
        });

        if (!response.success) {
          return { error: response.error?.message ?? "Failed to get events" };
        }

        const events = ((response.data as any)?.items as any[]) ?? [];

        // Sort by last timestamp descending and limit to 50
        const sortedEvents = events
          .sort((a: any, b: any) => {
            const timeA = new Date(a?.lastTimestamp ?? a?.metadata?.creationTimestamp ?? 0).getTime();
            const timeB = new Date(b?.lastTimestamp ?? b?.metadata?.creationTimestamp ?? 0).getTime();

            return timeB - timeA;
          })
          .slice(0, 50);

        return {
          count: events.length,
          showing: sortedEvents.length,
          events: sortedEvents.map((event: any) => ({
            type: event?.type,
            reason: event?.reason,
            message: event?.message,
            involvedObject: {
              kind: event?.involvedObject?.kind,
              name: event?.involvedObject?.name,
              namespace: event?.involvedObject?.namespace,
            },
            count: event?.count,
            lastTimestamp: event?.lastTimestamp,
          })),
        };
      },
    };
  },
});

export default getEventsToolInjectable;
