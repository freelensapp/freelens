/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import openSaveFileDialogInjectable from "../../../utils/save-file.injectable";
import callForLogsInjectable from "./call-for-logs.injectable";
import { getLeadingTimestamp, maxConcurrentLogRequests, mergePodLogs, stripAnsiColors } from "./merge-pod-logs";

import type { PodLogsQuery } from "@freelensapp/kube-object";

export interface PodLogsDescriptor {
  name: string;
  namespace: string;
}

export type DownloadAllLogsForPods = (
  filename: string,
  pods: readonly PodLogsDescriptor[],
  query: PodLogsQuery,
) => Promise<void>;

function removeLeadingTimestamp(line: string): string {
  const timestamp = getLeadingTimestamp(line);

  return timestamp ? line.slice(timestamp.length).trimStart() : line;
}

const downloadAllLogsForPodsInjectable = getInjectable({
  id: "download-all-logs-for-pods",

  instantiate: (di): DownloadAllLogsForPods => {
    const callForLogs = di.inject(callForLogsInjectable);
    const openSaveFileDialog = di.inject(openSaveFileDialogInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    return async (filename, pods, query) => {
      const linesByPod = new Map<string, string[]>();
      const queue = [...pods];

      const readNextPod = async (): Promise<void> => {
        for (let pod = queue.shift(); pod; pod = queue.shift()) {
          try {
            // The timestamps are what the lines of the pods are ordered by:
            // they are always asked for, and removed at the end when not wanted.
            const logs = await callForLogs(pod, { ...query, timestamps: true });

            linesByPod.set(pod.name, logs.trimEnd().replace(/\r/g, "\n").split("\n").filter(Boolean));
          } catch (error) {
            logger.error("Can't download logs: ", error);
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(maxConcurrentLogRequests, pods.length) }, readNextPod));

      // The pods answer in any order: a fixed order keeps the file stable.
      const orderedLinesByPod = new Map(
        pods.flatMap((pod) => {
          const lines = linesByPod.get(pod.name);

          return lines ? [[pod.name, lines] as const] : [];
        }),
      );
      const logs = mergePodLogs(orderedLinesByPod, { tagged: pods.length > 1 })
        .map(stripAnsiColors)
        .map((line) => (query.timestamps ? line : removeLeadingTimestamp(line)))
        .join("\n");

      if (logs) {
        openSaveFileDialog(`${filename}.log`, logs, "text/plain");
      } else {
        showErrorNotification("No logs to download");
      }
    };
  },
});

export default downloadAllLogsForPodsInjectable;
