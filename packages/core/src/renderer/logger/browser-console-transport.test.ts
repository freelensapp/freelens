/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createLogger, format } from "winston";
import { BrowserConsoleTransport } from "./browser-console-transport";

import type { MockInstance } from "vitest";
import type { Logger } from "winston";

describe("BrowserConsoleTransport", () => {
  let logger: Logger;
  let consoleMethods: Record<"debug" | "error" | "info" | "warn", MockInstance>;

  beforeEach(() => {
    consoleMethods = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    };

    // The same format the application's winston logger is created with, so
    // that the entries reaching the transport are shaped the same way
    logger = createLogger({
      level: "silly",
      format: format.combine(format.splat(), format.simple(), format.timestamp({ format: "DD/MM/YYYY HH:mm:ss" })),
      transports: [new BrowserConsoleTransport()],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a message with no metadata as just the message", () => {
    logger.info("plain message");

    expect(consoleMethods.info).toHaveBeenCalledWith("plain message");
  });

  it("passes a single metadata argument through unchanged", () => {
    const meta = { filePath: "/tmp/kubeconfig" };

    logger.warn("something happened", meta);

    expect(consoleMethods.warn).toHaveBeenCalledWith("something happened", meta);
  });

  it("keeps an Error inspectable rather than flattening it", () => {
    const error = new Error("boom");

    logger.error("request failed", error);

    // winston appends the error's own message to the message string; what
    // matters here is that the second argument is still the Error itself and
    // not a plain object built out of its fields
    expect(consoleMethods.error).toHaveBeenCalledWith("request failed boom", error);
  });

  it("reports the metadata of an entry logged with several arguments", () => {
    // winston's splat format moves two or more arguments onto the entry itself,
    // leaving nothing behind under the splat symbol. The previous transport,
    // winston-transport-browserconsole, printed an empty array here.
    logger.error("scaling failed", { replicas: 3 }, { namespace: "default" });

    expect(consoleMethods.error).toHaveBeenCalledWith("scaling failed", { replicas: 3, namespace: "default" });
  });

  it("interpolates placeholders into the message", () => {
    logger.info("connected to %s", "cluster-a");

    expect(consoleMethods.info).toHaveBeenCalledWith("connected to cluster-a", "cluster-a");
  });

  it.each([
    ["error", "error"],
    ["warn", "warn"],
    ["info", "info"],
    ["debug", "debug"],
    ["verbose", "debug"],
    ["silly", "debug"],
  ] as const)("maps the %s level onto console.%s", (level, method) => {
    logger.log(level, "a message");

    expect(consoleMethods[method]).toHaveBeenCalledWith("a message");
  });
});
