/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import openSaveFileDialogInjectable from "../../../utils/save-file.injectable";
import callForLogsInjectable from "./call-for-logs.injectable";
import { mergePodLogs } from "./merge-pod-logs";

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

const downloadAllLogsForPodsInjectable = getInjectable({
  id: "download-all-logs-for-pods",

  instantiate: (di): DownloadAllLogsForPods => {
    const callForLogs = di.inject(callForLogsInjectable);
    const openSaveFileDialog = di.inject(openSaveFileDialogInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    return async (filename, pods, query) => {
      const results = await Promise.allSettled(
        pods.map(async (pod) => ({
          podName: pod.name,
          lines: (await callForLogs(pod, query)).trimEnd().replace(/\r/g, "\n").split("\n").filter(Boolean),
        })),
      );

      const linesByPod = new Map<string, string[]>();

      for (const result of results) {
        if (result.status === "fulfilled") {
          linesByPod.set(result.value.podName, result.value.lines);
        } else {
          logger.error("Can't download logs: ", result.reason);
        }
      }

      const logs = mergePodLogs(linesByPod).join("\n");

      if (logs) {
        openSaveFileDialog(`${filename}.log`, logs, "text/plain");
      } else {
        showErrorNotification("No logs to download");
      }
    };
  },
});

export default downloadAllLogsForPodsInjectable;
