/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  createRequireDeprecationWarning,
  extensionCallingRequire,
  installRequireDeprecationWarning,
} from "./require-deprecation-warning";

import type { Logger } from "@freelensapp/logger";

// Stack strings in the shape Chromium produces for `new Error().stack` taken
// inside the wrapper, as measured on Electron 42.7.1: the wrapper's own frame
// first, then its caller.
const wrapperFrame = "    at wrapper (http://localhost:5173/renderer/index-abc123.js:120:17)";
const extensionUrl = "freelens-extension://extensions/freelensapp--fluxcd/1.0.0-0f1e2d3c/dist/renderer.js";
const hostUrl = "file:///opt/Freelens/resources/app.asar/out/renderer/index-abc123.js";

const stackOf = (...frames: string[]) => ["Error", wrapperFrame, ...frames].join("\n");

const createLogger = () => {
  const warn = vi.fn();

  return { logger: { warn } as unknown as Logger, warn };
};

describe("extensionCallingRequire", () => {
  it("names the extension when its code calls the wrapper from a named function", () => {
    expect(extensionCallingRequire(stackOf(`    at useCrypto (${extensionUrl}:1:31)`))).toBe("freelensapp--fluxcd");
  });

  it("names the extension when its code calls the wrapper from module scope", () => {
    expect(extensionCallingRequire(stackOf(`    at ${extensionUrl}:3:22`))).toBe("freelensapp--fluxcd");
  });

  it("reads the extension off a URL with a query, as a reload imports it", () => {
    expect(extensionCallingRequire(stackOf(`    at ${extensionUrl}?reload=2:3:22`))).toBe("freelensapp--fluxcd");
  });

  it("names the extension for a method or an async caller", () => {
    expect(extensionCallingRequire(stackOf(`    at Object.load [as run] (${extensionUrl}:8:2)`))).toBe(
      "freelensapp--fluxcd",
    );
    expect(extensionCallingRequire(stackOf(`    at async load (${extensionUrl}:8:2)`))).toBe("freelensapp--fluxcd");
    expect(extensionCallingRequire(stackOf(`    at async ${extensionUrl}:8:2`))).toBe("freelensapp--fluxcd");
  });

  it("does not blame the extension when host code it called into calls the wrapper", () => {
    expect(
      extensionCallingRequire(
        stackOf(`    at loadBuiltin (${hostUrl}:40:9)`, `    at onActivate (${extensionUrl}:12:5)`),
      ),
    ).toBeUndefined();
  });

  it("does not warn for the host's own calls", () => {
    expect(extensionCallingRequire(stackOf(`    at ${hostUrl}:5:10`))).toBeUndefined();
  });

  it("does not take the wrapper's own frame for its caller", () => {
    const extensionWrapperFrame = `    at wrapper (${extensionUrl}:1:1)`;

    expect(
      extensionCallingRequire(["Error", extensionWrapperFrame, `    at ${hostUrl}:5:10`].join("\n")),
    ).toBeUndefined();
  });

  it("does not warn for a URL on the scheme that is not an extension file", () => {
    expect(extensionCallingRequire(stackOf("    at freelens-extension://elsewhere/a/b/c.js:1:1"))).toBeUndefined();
    expect(extensionCallingRequire(stackOf("    at freelens-extension://extensions/only-a-name:1:1"))).toBeUndefined();
  });

  it("does not warn without a caller frame", () => {
    expect(extensionCallingRequire(stackOf())).toBeUndefined();
    expect(extensionCallingRequire(undefined)).toBeUndefined();
  });
});

describe("createRequireDeprecationWarning", () => {
  const fromExtension = (name: string) => stackOf(`    at ${extensionUrl.replace("freelensapp--fluxcd", name)}:1:1`);

  it("warns once per extension and module id", () => {
    const { logger, warn } = createLogger();
    const warnOnRequire = createRequireDeprecationWarning(logger);

    warnOnRequire(fromExtension("first"), "crypto");
    warnOnRequire(fromExtension("first"), "crypto");
    warnOnRequire(fromExtension("first"), "os");
    warnOnRequire(fromExtension("second"), "crypto");

    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn.mock.calls[0][0]).toContain('extension "first" called require("crypto")');
    expect(warn.mock.calls[1][0]).toContain('extension "first" called require("os")');
    expect(warn.mock.calls[2][0]).toContain('extension "second" called require("crypto")');
  });

  it("does not warn for a host caller", () => {
    const { logger, warn } = createLogger();

    createRequireDeprecationWarning(logger)(stackOf(`    at ${hostUrl}:5:10`), "crypto");

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("installRequireDeprecationWarning", () => {
  const createTarget = () => {
    const require = Object.assign(
      vi.fn((id: string) => ({ id })),
      { resolve: (id: string) => `/resolved/${id}`, cache: {} },
    );

    return { target: { require } as { require: (id: string) => unknown }, require };
  };

  it("returns what the original returns and reports each call with its stack and module id", () => {
    const { target, require } = createTarget();
    const warn = vi.fn();

    installRequireDeprecationWarning(target, warn);

    expect(target.require).not.toBe(require);
    expect(target.require("crypto")).toEqual({ id: "crypto" });
    expect(require).toHaveBeenCalledWith("crypto");
    expect(warn).toHaveBeenCalledWith(expect.any(String), "crypto");
  });

  it("captures the wrapper and its immediate caller, and restores the stack trace limit", () => {
    const { target } = createTarget();
    const warn = vi.fn();
    const stackTraceLimit = Error.stackTraceLimit;

    installRequireDeprecationWarning(target, warn);

    function callingFromTheTest() {
      return target.require("os");
    }

    callingFromTheTest();

    const frames = (warn.mock.calls[0][0] as string).split("\n").filter((line) => line.trim().startsWith("at "));

    expect(frames).toHaveLength(2);
    expect(frames[1]).toContain("callingFromTheTest");
    expect(Error.stackTraceLimit).toBe(stackTraceLimit);
  });

  it("keeps the original's own properties", () => {
    const { target, require } = createTarget();

    installRequireDeprecationWarning(target, vi.fn());

    expect((target.require as typeof require).resolve("os")).toBe("/resolved/os");
    expect((target.require as typeof require).cache).toBe(require.cache);
  });

  it("wraps only once", () => {
    const { target } = createTarget();
    const warn = vi.fn();

    installRequireDeprecationWarning(target, warn);

    const wrapper = target.require;

    installRequireDeprecationWarning(target, warn);

    expect(target.require).toBe(wrapper);
    target.require("os");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("leaves a target without require alone", () => {
    const target = {};

    installRequireDeprecationWarning(target, vi.fn());

    expect(target).not.toHaveProperty("require");
  });

  it("leaves a require it cannot replace alone", () => {
    const require = () => undefined;
    const target = Object.defineProperty({}, "require", { value: require, writable: false, configurable: false });

    installRequireDeprecationWarning(target, vi.fn());

    expect((target as { require: unknown }).require).toBe(require);
  });
});
