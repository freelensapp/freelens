/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { TerminalChannels } from "../../common/terminal/channels";
import { kubectlStatusOptionsFor, messageOfError, terminalStatusReporterFor } from "./send-terminal-status";
import { ShellOpenError } from "./shell-session";

import type WebSocket from "ws";

import type { TerminalMessage } from "../../common/terminal/channels";

describe("terminalStatusReporterFor", () => {
  let sent: TerminalMessage[];

  const websocketWith = (overrides: Partial<WebSocket> = {}) => {
    sent = [];

    return {
      readyState: 1,
      OPEN: 1,
      send: (raw: string) => void sent.push(JSON.parse(raw)),
      ...overrides,
    } as Partial<WebSocket> as WebSocket;
  };

  it("sends an info frame", () => {
    terminalStatusReporterFor(websocketWith()).info("Starting shell ...");

    expect(sent).toEqual([{ type: TerminalChannels.STATUS, data: { message: "Starting shell ...", level: "info" } }]);
  });

  it("sends an error frame", () => {
    terminalStatusReporterFor(websocketWith()).error("It went wrong");

    expect(sent).toEqual([{ type: TerminalChannels.STATUS, data: { message: "It went wrong", level: "error" } }]);
  });

  it("collapses a multi-line message, which a Kubernetes API body routinely is", () => {
    terminalStatusReporterFor(websocketWith()).error("pods is forbidden:\n  user cannot\tcreate\r\n  resource");

    expect(sent[0]).toEqual({
      type: TerminalChannels.STATUS,
      data: { message: "pods is forbidden:   user cannot create   resource", level: "error" },
    });
  });

  it("truncates a message that would wrap onto a second line", () => {
    terminalStatusReporterFor(websocketWith()).error("x".repeat(2000));

    const { message } = (sent[0] as { data: { message: string } }).data;

    expect(message).toHaveLength(500);
    expect(message.endsWith("...")).toBe(true);
  });

  it("says nothing on a socket that is no longer open", () => {
    terminalStatusReporterFor(websocketWith({ readyState: 3 })).info("Starting shell ...");

    expect(sent).toEqual([]);
  });

  it("swallows a send that fails, so a closed tab is not an unhandled rejection", () => {
    const websocket = websocketWith({
      send: () => {
        throw new Error("WebSocket is not open");
      },
    });

    expect(() => terminalStatusReporterFor(websocket).info("Starting shell ...")).not.toThrow();
  });
});

describe("kubectlStatusOptionsFor", () => {
  let sent: TerminalMessage[];
  let websocket: WebSocket;

  const messages = () => sent.map((message) => (message as { data: { message: string } }).data.message);

  beforeEach(() => {
    sent = [];
    websocket = {
      readyState: 1,
      OPEN: 1,
      send: (raw: string) => void sent.push(JSON.parse(raw)),
    } as Partial<WebSocket> as WebSocket;
  });

  it("formats the download progress with a percentage and both sizes", () => {
    const { onDownloadProgress } = kubectlStatusOptionsFor("1.33.4", terminalStatusReporterFor(websocket));

    onDownloadProgress?.({ transferred: 28_732_620, total: 61_970_432 });

    expect(messages()).toEqual(["Downloading kubectl v1.33.4   46%  27.4MiB / 59.1MiB"]);
  });

  it('starts at zero rather than at the "N/A" of an empty size', () => {
    const { onDownloadProgress } = kubectlStatusOptionsFor("1.33.4", terminalStatusReporterFor(websocket));

    onDownloadProgress?.({ transferred: 0, total: 61_970_432 });

    expect(messages()).toEqual(["Downloading kubectl v1.33.4    0%  0.0B / 59.1MiB"]);
  });

  it("drops the percentage when the server sent no content-length", () => {
    const { onDownloadProgress } = kubectlStatusOptionsFor("1.33.4", terminalStatusReporterFor(websocket));

    onDownloadProgress?.({ transferred: 28_732_620 });

    expect(messages()).toEqual(["Downloading kubectl v1.33.4  27.4MiB"]);
  });

  it("rate-limits the progress so a fast link cannot flood the socket", () => {
    vi.useFakeTimers();

    try {
      const { onDownloadProgress } = kubectlStatusOptionsFor("1.33.4", terminalStatusReporterFor(websocket));

      for (let transferred = 0; transferred < 1000; transferred += 100) {
        onDownloadProgress?.({ transferred, total: 61_970_432 });
      }

      expect(messages()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops a pending frame on done, so it cannot land on top of the next phase", () => {
    vi.useFakeTimers();

    try {
      const options = kubectlStatusOptionsFor("1.33.4", terminalStatusReporterFor(websocket));

      options.onDownloadProgress?.({ transferred: 100, total: 61_970_432 });
      options.onDownloadProgress?.({ transferred: 200, total: 61_970_432 });
      options.done();
      vi.advanceTimersByTime(1000);

      expect(messages()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves a phase as the last frame, with no trailing progress landing on top of it", () => {
    vi.useFakeTimers();

    try {
      const options = kubectlStatusOptionsFor("1.33.4", terminalStatusReporterFor(websocket));

      options.onDownloadProgress?.({ transferred: 100, total: 61_970_432 });
      options.onDownloadProgress?.({ transferred: 61_970_432, total: 61_970_432 });
      options.onPhase?.("Verifying kubectl v1.33.4 ...");
      vi.advanceTimersByTime(1000);

      expect(messages()).toEqual([
        "Downloading kubectl v1.33.4    0%  100.0B / 59.1MiB",
        "Verifying kubectl v1.33.4 ...",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("forwards a problem as an error frame", () => {
    const { onProblem } = kubectlStatusOptionsFor("1.33.4", terminalStatusReporterFor(websocket));

    onProblem?.("Failed to download kubectl v1.33.4 (checksum mismatch) - using the bundled v1.34.1");

    expect(sent).toEqual([
      {
        type: TerminalChannels.STATUS,
        data: {
          message: "Failed to download kubectl v1.33.4 (checksum mismatch) - using the bundled v1.34.1",
          level: "error",
        },
      },
    ]);
  });
});

describe("messageOfError", () => {
  it("prefers the cause, which is the real reason a shell session failed", () => {
    const error = new ShellOpenError("failed to create node pod", { cause: new Error("no such image") });

    expect(messageOfError(error)).toBe("no such image");
  });

  it("falls back to the error itself", () => {
    expect(messageOfError(new Error("boom"))).toBe("boom");
  });

  it("handles a rejection that is not an error at all", () => {
    expect(messageOfError("Pod creation timed out")).toBe("Pod creation timed out");
  });
});
