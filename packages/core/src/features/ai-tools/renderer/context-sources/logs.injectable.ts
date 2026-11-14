/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import callForLogsInjectable from "../../../../renderer/components/dock/logs/call-for-logs.injectable";
import { aiContextSourceInjectionToken } from "../context-source";

const tailLines = 200;
const maxContainers = 3;

const containerNamesOf = (manifest: Record<string, unknown> | undefined) => {
  const spec = manifest?.spec as { containers?: { name?: string }[] } | undefined;

  return (spec?.containers ?? []).map((container) => container.name).filter((name): name is string => Boolean(name));
};

const logsAiContextSourceInjectable = getInjectable({
  id: "logs-ai-context-source",
  instantiate: (di) => ({
    id: "logs",
    label: "Pod logs",
    description: `The last ${tailLines} lines per container (up to ${maxContainers} containers), including the previous run's when it crashed.`,
    orderNumber: 30,
    isAvailableFor: (target) =>
      target.type === "logs" || (target.type === "resource" && target.resource.kind === "Pod"),
    isEnabledByDefaultFor: (target) => target.type === "logs",
    collect: async (target, signal) => {
      const callForLogs = di.inject(callForLogsInjectable);

      if (target.type === "logs") {
        const logs =
          target.logs ??
          (await callForLogs(
            { name: target.pod.name, namespace: target.pod.namespace ?? "default" },
            { container: target.container, tailLines },
            signal,
          ));

        return {
          title: `Logs${target.container ? ` of container ${target.container}` : ""}`,
          body: logs || "(no output)",
        };
      }

      if (target.type !== "resource") {
        return undefined;
      }

      const { name, namespace = "default" } = target.resource;
      const containers = containerNamesOf(target.manifest).slice(0, maxContainers);
      const parts: string[] = [];

      for (const container of containers.length ? containers : [undefined]) {
        const heading = container ? `--- container ${container} ---` : "--- logs ---";

        try {
          parts.push(
            heading,
            (await callForLogs({ name, namespace }, { container, tailLines }, signal)) || "(no output)",
          );
        } catch (error) {
          parts.push(heading, `(could not read logs: ${String(error)})`);
        }

        try {
          const previous = await callForLogs({ name, namespace }, { container, tailLines: 50, previous: true }, signal);

          if (previous.trim()) {
            parts.push(`--- previous run${container ? ` of ${container}` : ""} ---`, previous);
          }
        } catch {
          // No previous run: the container never restarted.
        }
      }

      return { title: "Pod logs", body: parts.join("\n") };
    },
  }),
  injectionToken: aiContextSourceInjectionToken,
});

export default logsAiContextSourceInjectable;
