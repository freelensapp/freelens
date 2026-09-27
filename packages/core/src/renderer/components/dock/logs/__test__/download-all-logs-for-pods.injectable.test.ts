/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import openSaveFileDialogInjectable from "../../../../utils/save-file.injectable";
import callForLogsInjectable from "../call-for-logs.injectable";
import downloadAllLogsForPodsInjectable from "../download-all-logs-for-pods.injectable";

import type { Mock } from "vitest";

import type { CallForLogs } from "../call-for-logs.injectable";
import type { DownloadAllLogsForPods } from "../download-all-logs-for-pods.injectable";

describe("download all logs of the pods of a combined tab", () => {
  const pods = [
    { name: "pod-a", namespace: "default" },
    { name: "pod-b", namespace: "default" },
  ];
  const query = { previous: false, container: "app" };
  let callForLogs: ReturnType<typeof vi.fn<CallForLogs>>;
  let openSaveFileDialog: Mock;
  let showErrorNotification: Mock;
  let downloadAllLogsForPods: DownloadAllLogsForPods;

  beforeEach(() => {
    const di = getDiForUnitTesting();
    const logsOfPods = new Map([
      ["pod-a", "2026-01-01T00:00:01.000000000Z a1\n2026-01-01T00:00:03.000000000Z a2\n"],
      ["pod-b", "2026-01-01T00:00:02.000000000Z b1\n"],
    ]);

    callForLogs = vi.fn<CallForLogs>(async ({ name }) => logsOfPods.get(name) ?? "");
    openSaveFileDialog = vi.fn();
    showErrorNotification = vi.fn();
    di.override(callForLogsInjectable, () => callForLogs);
    di.override(openSaveFileDialogInjectable, () => openSaveFileDialog);
    di.override(showErrorNotificationInjectable, () => showErrorNotification);

    downloadAllLogsForPods = di.inject(downloadAllLogsForPodsInjectable);
  });

  it("saves the lines in chronological order, tagged with the pod and without color codes", async () => {
    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(openSaveFileDialog).toHaveBeenCalledWith(
      "super-deployment.log",
      [
        "2026-01-01T00:00:01.000000000Z [pod-a] a1",
        "2026-01-01T00:00:02.000000000Z [pod-b] b1",
        "2026-01-01T00:00:03.000000000Z [pod-a] a2",
      ].join("\n"),
      "text/plain",
    );
  });

  it("keeps the chronological order when the timestamps are not wanted in the file", async () => {
    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: false });

    expect(callForLogs).toHaveBeenCalledWith(pods[0], { ...query, timestamps: true });
    expect(callForLogs).toHaveBeenCalledWith(pods[1], { ...query, timestamps: true });
    expect(openSaveFileDialog).toHaveBeenCalledWith(
      "super-deployment.log",
      ["[pod-a] a1", "[pod-b] b1", "[pod-a] a2"].join("\n"),
      "text/plain",
    );
  });

  it("saves the lines of the pods that answer when one of them fails", async () => {
    callForLogs.mockImplementation(async ({ name }) => {
      if (name === "pod-a") {
        throw new Error("pod-a is gone");
      }

      return "2026-01-01T00:00:02.000000000Z b1";
    });

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(openSaveFileDialog).toHaveBeenCalledWith(
      "super-deployment.log",
      "2026-01-01T00:00:02.000000000Z [pod-b] b1",
      "text/plain",
    );
  });

  it("tells when there is nothing to save", async () => {
    callForLogs.mockResolvedValue("");

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(openSaveFileDialog).not.toHaveBeenCalled();
    expect(showErrorNotification).toHaveBeenCalledWith("No logs to download");
  });
});
