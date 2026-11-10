/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LogFunction } from "@freelensapp/logger";

/**
 * The subset of `NodeJS.WriteStream` this module needs. Keeping it structural
 * lets the tests pass plain `EventEmitter`s instead of real TTY/pipe streams.
 */
export interface ErrorEmittingStream {
  on(event: "error", listener: (error: NodeJS.ErrnoException) => void): unknown;
}

export interface NamedStream {
  name: string;
  stream: ErrorEmittingStream | undefined;
}

/**
 * `EPIPE` is what a write gets once the reader on the other end of the pipe is
 * gone (a launcher such as Amazon AppStream 2.0 tearing down the pipe it
 * captures our output with, or a plain `freelens | head`). `EIO` is the same
 * situation for a controlling terminal that went away. Neither says anything
 * about the health of the application, only that nobody is listening any more.
 */
const brokenPipeErrorCodes = new Set(["EPIPE", "EIO"]);

/**
 * `process.stdout` and `process.stderr` are stable objects for the lifetime of
 * the process, so a `WeakSet` of the streams already handled makes repeated
 * calls (a second registration, a re-run of the startup phase) idempotent
 * instead of piling up listeners.
 */
const handledStreams = new WeakSet<ErrorEmittingStream>();

/**
 * Streams that have already reported a non-broken-pipe error. Reporting goes
 * through the logger, and the logger writes to the console transport, i.e.
 * back to the very stream that just failed. Since stream errors are emitted
 * asynchronously, a re-entrancy flag would not catch that feedback loop, so
 * each stream reports only its first unexpected error and silently swallows
 * the rest. The first one carries the diagnosis; the repeats would only be the
 * same error echoing.
 */
const reportedStreams = new WeakSet<ErrorEmittingStream>();

/**
 * Attaches an `error` listener to the given process output streams so that a
 * broken output pipe cannot crash the process.
 *
 * Node emits `error` on `process.stdout`/`process.stderr` when a write fails,
 * and an `error` event without a listener is re-thrown by `EventEmitter` as an
 * uncaught exception -- which, in the Electron main process, means the
 * "A JavaScript error occurred in the main process" dialog and a dead app. See
 * https://github.com/freelensapp/freelens/issues/2370.
 *
 * Broken-pipe errors are swallowed: the file transport is unaffected by them,
 * so nothing that matters is lost. Any other error is reported through the
 * logger (and therefore recorded in the log file) rather than re-thrown --
 * crashing the application because writing a log line failed is exactly the
 * behaviour this module exists to remove, and the file transport keeps the
 * information available for a bug report.
 */
export function ignoreBrokenPipeErrors(streams: NamedStream[], logError: LogFunction): void {
  for (const { name, stream } of streams) {
    // A packaged Windows GUI process can be started with no console attached,
    // in which case the standard streams may be missing entirely.
    if (!stream || handledStreams.has(stream)) {
      continue;
    }

    handledStreams.add(stream);

    stream.on("error", (error: NodeJS.ErrnoException) => {
      if (brokenPipeErrorCodes.has(error.code ?? "")) {
        return;
      }

      if (reportedStreams.has(stream)) {
        return;
      }

      reportedStreams.add(stream);
      logError(`Failed to write to ${name}: ${error.message}`, error);
    });
  }
}
