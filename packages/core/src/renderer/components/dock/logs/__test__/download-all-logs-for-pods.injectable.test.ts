/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable, showInfoNotificationInjectable } from "@freelensapp/notifications";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import openSaveFileDialogInjectable from "../../../../utils/save-file.injectable";
import callForLogsInjectable from "../call-for-logs.injectable";
import downloadAllLogsForPodsInjectable from "../download-all-logs-for-pods.injectable";
import { maxCombinedLogsDownloadBytes } from "../merge-pod-logs";

import type { Mock } from "vitest";

import type { CallForLogs } from "../call-for-logs.injectable";
import type { DownloadAllLogsForPods } from "../download-all-logs-for-pods.injectable";

// A small limit keeps the logs of the tests short: 500 bytes for each of two pods.
vi.mock("../merge-pod-logs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../merge-pod-logs")>()),
  maxCombinedLogsDownloadBytes: 1000,
}));

// A line of 39 characters for numbers from 10 to 59, 40 bytes with its line break.
const line = (pod: string, n: number) => `2026-01-01T00:00:${String(n).padStart(2, "0")}.000000000Z ${pod} ${n}`;
const linesOf = (pod: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => line(pod, from + index));
const textOf = (lines: readonly string[]) => lines.map((text) => `${text}\n`).join("");

describe("download all logs of the pods of a combined tab", () => {
  const pods = [
    { name: "pod-a", namespace: "default" },
    { name: "pod-b", namespace: "default" },
  ];
  const query = { previous: false, container: "app" };
  const share = maxCombinedLogsDownloadBytes / pods.length;
  const filename = "super-deployment-2026-10-03T09-55-41-123Z.log";
  let callForLogs: ReturnType<typeof vi.fn<CallForLogs>>;
  let openSaveFileDialog: Mock;
  let showErrorNotification: Mock;
  let showInfoNotification: Mock;
  let downloadAllLogsForPods: DownloadAllLogsForPods;

  // Answers as the API does: the last tailLines lines when asked, cut at limitBytes.
  const answerFrom =
    (logsOfPods: ReadonlyMap<string, readonly string[]>): CallForLogs =>
    async ({ name }, podQuery) => {
      const lines = logsOfPods.get(name) ?? [];
      const text = textOf(podQuery?.tailLines === undefined ? lines : lines.slice(-podQuery.tailLines));

      return podQuery?.limitBytes === undefined ? text : text.slice(0, podQuery.limitBytes);
    };
  const savedLines = () => (openSaveFileDialog.mock.calls[0]?.[1] as string | undefined)?.split("\n");
  const callsFor = (name: string) => callForLogs.mock.calls.filter(([pod]) => pod.name === name);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T09:55:41.123Z"));

    const di = getDiForUnitTesting();
    const logsOfPods = new Map([
      ["pod-a", "2026-01-01T00:00:01.000000000Z a1\n2026-01-01T00:00:03.000000000Z a2\n"],
      ["pod-b", "2026-01-01T00:00:02.000000000Z b1\n"],
    ]);

    callForLogs = vi.fn<CallForLogs>(async ({ name }) => logsOfPods.get(name) ?? "");
    openSaveFileDialog = vi.fn();
    showErrorNotification = vi.fn();
    showInfoNotification = vi.fn();
    di.override(callForLogsInjectable, () => callForLogs);
    di.override(openSaveFileDialogInjectable, () => openSaveFileDialog);
    di.override(showErrorNotificationInjectable, () => showErrorNotification);
    di.override(showInfoNotificationInjectable, () => showInfoNotification);

    downloadAllLogsForPods = di.inject(downloadAllLogsForPodsInjectable);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves the lines in chronological order, tagged with the pod and without color codes", async () => {
    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(openSaveFileDialog).toHaveBeenCalledWith(
      filename,
      [
        "2026-01-01T00:00:01.000000000Z [pod-a] a1",
        "2026-01-01T00:00:02.000000000Z [pod-b] b1",
        "2026-01-01T00:00:03.000000000Z [pod-a] a2",
      ].join("\n"),
      "text/plain",
    );
    expect(showInfoNotification).not.toHaveBeenCalled();
  });

  it("keeps the chronological order when the timestamps are not wanted in the file", async () => {
    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: false });

    expect(callForLogs).toHaveBeenCalledWith(pods[0], { ...query, timestamps: true, limitBytes: share });
    expect(callForLogs).toHaveBeenCalledWith(pods[1], { ...query, timestamps: true, limitBytes: share });
    expect(openSaveFileDialog).toHaveBeenCalledWith(
      filename,
      ["[pod-a] a1", "[pod-b] b1", "[pod-a] a2"].join("\n"),
      "text/plain",
    );
  });

  it("saves the lines of the pods that answer when one of them fails, and tells which one failed", async () => {
    callForLogs.mockImplementation(async ({ name }) => {
      if (name === "pod-a") {
        throw new Error("pod-a is gone");
      }

      return "2026-01-01T00:00:02.000000000Z b1";
    });

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(openSaveFileDialog).toHaveBeenCalledWith(
      filename,
      "2026-01-01T00:00:02.000000000Z [pod-b] b1",
      "text/plain",
    );
    expect(showErrorNotification).toHaveBeenCalledWith("Can't read the logs of pod-a");
  });

  it("tells when there is nothing to save", async () => {
    callForLogs.mockResolvedValue("");

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(openSaveFileDialog).not.toHaveBeenCalled();
    expect(showErrorNotification).toHaveBeenCalledWith("No logs to download");
  });

  it("asks a longer log again for its most recent lines, in what the other pods left", async () => {
    callForLogs.mockImplementation(
      answerFrom(
        new Map([
          ["pod-a", linesOf("pod-a", 10, 59)],
          ["pod-b", [line("pod-b", 30)]],
        ]),
      ),
    );

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    const [, second] = callsFor("pod-a");
    const tailLines = second[1]?.tailLines ?? 0;

    expect(second[1]).toMatchObject({ limitBytes: maxCombinedLogsDownloadBytes - 40 });
    expect(tailLines).toBeGreaterThan(share / 40);
    expect(savedLines()?.filter((text) => text.includes("[pod-a]"))).toEqual(
      linesOf("pod-a", 60 - tailLines, 59).map((text) => text.replace("Z pod-a", "Z [pod-a] pod-a")),
    );
    expect(showInfoNotification).toHaveBeenCalledWith(
      "The logs of pod-a do not fit in the 1000.0B of a download: the file has only their most recent lines",
    );
  });

  it("saves a longer log whole when it fits in what the other pods left", async () => {
    callForLogs.mockImplementation(
      answerFrom(
        new Map([
          ["pod-a", linesOf("pod-a", 10, 24)],
          ["pod-b", [line("pod-b", 30)]],
        ]),
      ),
    );

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(callsFor("pod-a")).toHaveLength(2);
    expect(savedLines()?.filter((text) => text.includes("[pod-a]"))).toHaveLength(15);
    expect(showInfoNotification).not.toHaveBeenCalled();
  });

  it("asks once more when the most recent lines are longer than the first ones", async () => {
    const longLine = (n: number) => `${line("pod-a", n)} ${"y".repeat(200)}`;

    callForLogs.mockImplementation(
      answerFrom(
        new Map([
          ["pod-a", [...linesOf("pod-a", 10, 39), ...Array.from({ length: 20 }, (_, index) => longLine(40 + index))]],
          ["pod-b", []],
        ]),
      ),
    );

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    const calls = callsFor("pod-a");
    const tailLines = calls[2]?.[1]?.tailLines ?? 0;

    expect(calls).toHaveLength(3);
    expect(tailLines).toBeLessThan(calls[1][1]?.tailLines ?? 0);
    expect(savedLines()).toEqual(
      Array.from({ length: tailLines }, (_, index) => longLine(60 - tailLines + index)).map((text) =>
        text.replace("Z pod-a", "Z [pod-a] pod-a"),
      ),
    );
  });

  it("keeps the last line of a log the API cut at a line break, and leaves out a line it cut in two", async () => {
    const answers = [
      textOf(linesOf("pod-a", 10, 59)).slice(0, share),
      textOf(linesOf("pod-a", 20, 59)).slice(0, maxCombinedLogsDownloadBytes),
      textOf(linesOf("pod-a", 35, 59)),
    ];

    callForLogs.mockImplementation(async ({ name }) => (name === "pod-a" ? (answers.shift() ?? "") : ""));
    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });
    expect(savedLines()?.at(-1)).toBe("2026-01-01T00:00:59.000000000Z [pod-a] pod-a 59");

    answers.push(
      textOf(linesOf("pod-a", 10, 59)).slice(0, share),
      textOf(linesOf("pod-a", 20, 59)).slice(0, maxCombinedLogsDownloadBytes),
      textOf([...linesOf("pod-a", 35, 58), `${line("pod-a", 59)} and more`]).slice(0, maxCombinedLogsDownloadBytes),
    );
    openSaveFileDialog.mockClear();
    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });
    expect(savedLines()?.at(-1)).toBe("2026-01-01T00:00:58.000000000Z [pod-a] pod-a 58");
  });

  it("does not start a second download while one is running", async () => {
    let answer!: (logs: string) => void;

    callForLogs.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );

    const first = downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    await downloadAllLogsForPods("other-deployment", pods, { ...query, timestamps: true });
    expect(showInfoNotification).toHaveBeenCalledWith("All logs of super-deployment are still downloading");
    expect(callForLogs).toHaveBeenCalledTimes(2);

    answer("2026-01-01T00:00:01.000000000Z a1\n");
    await first;
    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });

    expect(openSaveFileDialog).toHaveBeenCalledTimes(2);
  });

  it("tells when the file cannot be saved, and lets the next download run", async () => {
    openSaveFileDialog.mockImplementationOnce(() => {
      throw new RangeError("Invalid string length");
    });

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });
    expect(showErrorNotification).toHaveBeenCalledWith("Can't download logs");

    await downloadAllLogsForPods("super-deployment", pods, { ...query, timestamps: true });
    expect(openSaveFileDialog).toHaveBeenCalledTimes(2);
  });
});
