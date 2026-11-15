/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable, showInfoNotificationInjectable } from "@freelensapp/notifications";
import { bytesToUnits } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import openSaveFileDialogInjectable from "../../../utils/save-file.injectable";
import callForLogsInjectable from "./call-for-logs.injectable";
import { getTimestampedLogFilename } from "./get-timestamped-log-filename";
import {
  getLeadingTimestamp,
  maxCombinedLogsDownloadBytes,
  maxConcurrentLogRequests,
  mergePodLogs,
  stripAnsiColors,
} from "./merge-pod-logs";

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

interface PodLogsRead {
  lines: string[];
  // The lines as the API counts them: the pieces of a line split on "\r" carry no timestamp.
  apiLines: number;
  bytes: number;
  // The API stopped at limitBytes, so the log goes on.
  cut: boolean;
}

function removeLeadingTimestamp(line: string): string {
  const timestamp = getLeadingTimestamp(line);

  return timestamp ? line.slice(timestamp.length).trimStart() : line;
}

function namePods(names: readonly string[]): string {
  return names.length <= 3 ? names.join(", ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more pods`;
}

// Runs `read` for every item, a few at a time.
async function readEach<T>(items: readonly T[], read: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const readNext = async (): Promise<void> => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      await read(item);
    }
  };

  await Promise.all(Array.from({ length: Math.min(maxConcurrentLogRequests, items.length) }, readNext));
}

const downloadAllLogsForPodsInjectable = getInjectable({
  id: "download-all-logs-for-pods",

  instantiate: (di): DownloadAllLogsForPods => {
    const callForLogs = di.inject(callForLogsInjectable);
    const openSaveFileDialog = di.inject(openSaveFileDialogInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const showInfoNotification = di.inject(showInfoNotificationInjectable);
    const encoder = new TextEncoder();
    // The file name of the download that is running: every download can take
    // all of maxCombinedLogsDownloadBytes, and many times as much while it is
    // merged, so only one runs at a time.
    let downloading: string | undefined;

    const readPodLogs = async (
      pod: PodLogsDescriptor,
      query: PodLogsQuery,
      limitBytes: number,
      tailLines?: number,
    ): Promise<PodLogsRead> => {
      // The timestamps are what the lines of the pods are ordered by:
      // they are always asked for, and removed at the end when not wanted.
      const logs = await callForLogs(pod, {
        ...query,
        timestamps: true,
        limitBytes,
        ...(tailLines === undefined ? {} : { tailLines }),
      });
      const bytes = encoder.encode(logs).byteLength;
      const lines = logs.trimEnd().replace(/\r/g, "\n").split("\n").filter(Boolean);
      const cut = bytes >= limitBytes;

      // The API ends a longer log at limitBytes exactly, usually in the middle of a line.
      if (cut && !logs.endsWith("\n")) {
        lines.pop();
      }

      return { lines, apiLines: lines.filter((line) => getLeadingTimestamp(line)).length, bytes, cut };
    };

    return async (filename, pods, query) => {
      if (downloading) {
        showInfoNotification(`All logs of ${downloading} are still downloading`);

        return;
      }

      downloading = filename;

      try {
        const linesByPod = new Map<string, string[]>();
        const failedPods = new Set<string>();
        const longPods: { pod: PodLogsDescriptor; read: PodLogsRead }[] = [];
        const cutPods: string[] = [];
        const share = Math.floor(maxCombinedLogsDownloadBytes / Math.max(pods.length, 1));
        let bytesOfWholeLogs = 0;

        // Every pod is asked for its share of the limit: most logs fit in it whole.
        await readEach(pods, async (pod) => {
          try {
            const read = await readPodLogs(pod, query, share);

            if (read.cut) {
              longPods.push({ pod, read });
            } else {
              linesByPod.set(pod.name, read.lines);
              bytesOfWholeLogs += read.bytes;
            }
          } catch (error) {
            logger.error("Can't download logs: ", error);
            failedPods.add(pod.name);
          }
        });

        // Without tailLines the API reads a log from its start, so the cut kept
        // the oldest lines. The longer logs share what the others left, and are
        // asked again for their most recent lines, as many as fit in it at the
        // size of their lines. A log whose last lines are longer than the first
        // ones can be cut again, then it is asked once more at its new size.
        const budget = Math.floor((maxCombinedLogsDownloadBytes - bytesOfWholeLogs) / Math.max(longPods.length, 1));

        await readEach(longPods, async ({ pod, read: firstRead }) => {
          let read = firstRead;
          let tailLines = 0;

          try {
            for (let attempt = 0; attempt < 2 && read.cut; attempt += 1) {
              const bytesPerLine = read.bytes / Math.max(read.apiLines, 1);

              tailLines = Math.max(1, Math.floor((budget * 0.9) / bytesPerLine));
              read = await readPodLogs(pod, query, budget, tailLines);
            }

            linesByPod.set(pod.name, read.lines);

            // Fewer lines than asked for, and not cut, are the whole log.
            if (read.cut || read.apiLines >= tailLines) {
              cutPods.push(pod.name);
            }
          } catch (error) {
            logger.error("Can't download logs: ", error);
            failedPods.add(pod.name);
          }
        });

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

        if (failedPods.size > 0) {
          showErrorNotification(`Can't read the logs of ${namePods([...failedPods])}`);
        }

        if (!logs) {
          showErrorNotification("No logs to download");

          return;
        }

        openSaveFileDialog(getTimestampedLogFilename(filename), logs, "text/plain");

        if (cutPods.length > 0) {
          showInfoNotification(
            `The logs of ${namePods(cutPods)} do not fit in the ${bytesToUnits(maxCombinedLogsDownloadBytes)} of a download: the file has only their most recent lines`,
          );
        }
      } catch (error) {
        logger.error("Can't download logs: ", error);
        showErrorNotification("Can't download logs");
      } finally {
        downloading = undefined;
      }
    };
  },
});

export default downloadAllLogsForPodsInjectable;
