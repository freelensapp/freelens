/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ignoreBrokenPipeErrors } from "./ignore-broken-pipe-errors";

import type { LogFunction } from "@freelensapp/logger";

const errorWithCode = (code: string) => Object.assign(new Error(`write ${code}`), { code });

describe("ignoreBrokenPipeErrors", () => {
  let stdout: EventEmitter;
  let stderr: EventEmitter;
  let logError: LogFunction;

  beforeEach(() => {
    // A fresh EventEmitter per test: it re-throws an "error" event that has no
    // listener, which is exactly the crash being guarded against.
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    logError = vi.fn();

    ignoreBrokenPipeErrors(
      [
        { name: "stdout", stream: stdout },
        { name: "stderr", stream: stderr },
      ],
      logError,
    );
  });

  it.each(["EPIPE", "EIO"])("swallows %s on stdout", (code) => {
    expect(() => stdout.emit("error", errorWithCode(code))).not.toThrow();
    expect(logError).not.toHaveBeenCalled();
  });

  it.each(["EPIPE", "EIO"])("swallows %s on stderr", (code) => {
    expect(() => stderr.emit("error", errorWithCode(code))).not.toThrow();
    expect(logError).not.toHaveBeenCalled();
  });

  it("keeps swallowing every subsequent broken pipe error", () => {
    for (let i = 0; i < 5; i += 1) {
      expect(() => stdout.emit("error", errorWithCode("EPIPE"))).not.toThrow();
    }

    expect(logError).not.toHaveBeenCalled();
  });

  it("reports any other error through the logger instead of throwing", () => {
    const error = errorWithCode("ENOSPC");

    expect(() => stdout.emit("error", error)).not.toThrow();
    expect(logError).toHaveBeenCalledWith("Failed to write to stdout: write ENOSPC", error);
  });

  it("reports an error without a code", () => {
    const error = new Error("something went wrong");

    expect(() => stderr.emit("error", error)).not.toThrow();
    expect(logError).toHaveBeenCalledWith("Failed to write to stderr: something went wrong", error);
  });

  it("reports an unexpected error only once per stream, so logging it cannot feed back into itself", () => {
    stdout.emit("error", errorWithCode("ENOSPC"));
    stdout.emit("error", errorWithCode("ENOSPC"));
    stdout.emit("error", errorWithCode("ENXIO"));

    expect(logError).toHaveBeenCalledTimes(1);
  });

  it("reports each stream separately", () => {
    stdout.emit("error", errorWithCode("ENOSPC"));
    stderr.emit("error", errorWithCode("ENOSPC"));

    expect(logError).toHaveBeenCalledTimes(2);
  });

  it("does not attach a second listener when called again for the same stream", () => {
    ignoreBrokenPipeErrors([{ name: "stdout", stream: stdout }], logError);

    expect(stdout.listenerCount("error")).toBe(1);
  });

  it("tolerates missing streams", () => {
    expect(() => ignoreBrokenPipeErrors([{ name: "stdout", stream: undefined }], logError)).not.toThrow();
  });
});
