/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { kubeEventApiInjectable } from "@freelensapp/kube-api-specifics";
import { getInjectable } from "@ogre-tools/injectable";
import { aiContextSourceInjectionToken } from "../context-source";
import { formatEvents } from "./format-events";

import type { EventLike } from "./format-events";

const eventsAiContextSourceInjectable = getInjectable({
  id: "events-ai-context-source",
  instantiate: (di) => ({
    id: "events",
    label: "Kubernetes events",
    description: "Recent events: for a resource, its own; otherwise warnings only.",
    orderNumber: 20,
    isAvailableFor: (target) => target.type !== "yaml",
    isEnabledByDefaultFor: (target) => target.type === "events",
    collect: async (target) => {
      const api = di.inject(kubeEventApiInjectable);

      if (target.type === "resource" || target.type === "logs") {
        const ref = target.type === "resource" ? target.resource : target.pod;
        const selector = [`involvedObject.kind=${ref.kind}`, `involvedObject.name=${ref.name}`];
        const events = (await api.list({ namespace: ref.namespace ?? "" }, { fieldSelector: selector })) ?? [];

        return {
          title: `Events of ${ref.kind} ${ref.name}`,
          body: formatEvents(events as EventLike[]) || "No events found for this object.",
        };
      }

      const namespace = target.type === "events" ? target.namespace : undefined;
      const events = (await api.list({ namespace: namespace ?? "" }, { fieldSelector: "type=Warning" })) ?? [];

      return {
        title: namespace ? `Warning events in namespace ${namespace}` : "Warning events in the cluster",
        body: formatEvents(events as EventLike[]) || "No warning events found.",
      };
    },
  }),
  injectionToken: aiContextSourceInjectionToken,
});

export default eventsAiContextSourceInjectable;
