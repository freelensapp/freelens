/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits } from "@freelensapp/utilities";
import { throttle } from "es-toolkit/compat";
import { TerminalChannels } from "../../common/terminal/channels";

import type WebSocket from "ws";

import type { TerminalMessage, TerminalStatusLevel } from "../../common/terminal/channels";
import type { DownloadProgress } from "../fetch/download-binary.injectable";
import type { KubectlProgressOptions } from "../kubectl/kubectl";

/**
 * A status frame occupies exactly one terminal line, so a message longer than
 * this is cut rather than allowed to wrap.
 */
const maxMessageLength = 500;

/**
 * How often the download indicator may be rewritten. Every frame is a
 * websocket message, and a fast link produces chunks far quicker than anyone
 * can read them.
 */
const progressInterval = 200;

export interface TerminalStatusReporter {
  info(message: string): void;
  error(message: string): void;
}

/**
 * Error text from a Kubernetes API body or an `Error.message` is routinely
 * multi-line, and a raw newline would break the single-line contract.
 */
const singleLine = (message: string) => {
  const collapsed = message.replace(/\s+/g, " ").trim();

  return collapsed.length > maxMessageLength ? `${collapsed.slice(0, maxMessageLength - 3)}...` : collapsed;
};

/**
 * Sends startup status to a terminal that is waiting for its shell.
 *
 * Tolerant on purpose: the session keeps running even when nobody is
 * listening any more, so a tab closed mid-download must not turn a status
 * frame into an unhandled rejection.
 */
export const terminalStatusReporterFor = (websocket: WebSocket): TerminalStatusReporter => {
  const send = (message: string, level: TerminalStatusLevel) => {
    if (websocket.readyState !== websocket.OPEN) {
      return;
    }

    const frame: TerminalMessage = {
      type: TerminalChannels.STATUS,
      data: {
        message: singleLine(message),
        level,
      },
    };

    try {
      websocket.send(JSON.stringify(frame));
    } catch {
      // the socket died between the check and the send
    }
  };

  return {
    info: (message) => send(message, "info"),
    error: (message) => send(message, "error"),
  };
};

/** `bytesToUnits` reports anything non-positive as "N/A", which no download is. */
const formatBytes = (bytes: number) => (bytes > 0 ? bytesToUnits(bytes) : "0.0B");

const formatDownloadProgress = (version: string, { transferred, total }: DownloadProgress) => {
  // Fixed-width percentage: every frame rewrites the same line, so a message
  // that changes length visibly jitters.
  const percentage = total ? `${String(Math.floor((transferred / total) * 100)).padStart(3)}%  ` : "";
  const outOf = total ? ` / ${formatBytes(total)}` : "";

  return `Downloading kubectl v${version}  ${percentage}${formatBytes(transferred)}${outOf}`;
};

export interface KubectlStatusOptions extends KubectlProgressOptions {
  /**
   * Drops a throttled progress frame that has not been sent yet, so that it
   * cannot land on top of whichever phase comes after the download.
   */
  done(): void;
}

/**
 * Turns kubectl's reporting hooks into terminal status: the download progress
 * becomes a rate-limited transient line, every problem a sticky error line.
 */
export const kubectlStatusOptionsFor = (version: string, status: TerminalStatusReporter): KubectlStatusOptions => {
  const onDownloadProgress = throttle(
    (progress: DownloadProgress) => status.info(formatDownloadProgress(version, progress)),
    progressInterval,
  );

  return {
    onDownloadProgress,
    onProblem: (message) => status.error(message),
    done: () => onDownloadProgress.cancel(),
  };
};

/**
 * The message of an error, preferring the reason it wraps: a
 * {@link ShellOpenError} says "failed to create node pod" while its cause says
 * what actually went wrong.
 */
export const messageOfError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.cause instanceof Error ? error.cause.message : error.message;
  }

  return String(error);
};
