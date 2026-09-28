/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { extensionSchemeOrigin, parseExtensionFileUrl } from "../common/scheme";

import type { Logger } from "@freelensapp/logger";

/**
 * Renderer code gets no guarantee of Node or Electron, `require()` included:
 * it is reachable only because the renderer is not context-isolated. Nothing
 * blocks it -- with `contextIsolation: false` the globals are shared, so a block
 * would not hold -- but an extension calling it is told, once per module id, so
 * the dependency does not settle in unnoticed before the renderer is isolated.
 *
 * The host calls `globalThis.require` too (the Node-builtin shim in
 * `freelens/electron.vite.config.ts` emits exactly that), and so does host code
 * an extension calls into. Neither may warn, so the decision rests on the
 * **immediate caller** alone -- the first frame above the wrapper -- and never
 * on an extension frame further down the stack. Code an extension bundles is
 * part of its file and counts as the extension.
 */

const locationPattern = /\(([^()]+)\)$/;
const lineAndColumnPattern = /:\d+:\d+$/;

/**
 * The location a Chromium stack frame points at, without its line and column,
 * for both `at fn (url:line:col)` and `at url:line:col`.
 */
function frameLocation(frame: string): string | undefined {
  const trimmed = frame.trim();

  if (!trimmed.startsWith("at ")) {
    return undefined;
  }

  const body = trimmed.slice("at ".length);
  const location = locationPattern.exec(body)?.[1] ?? body.replace(/^async /, "");

  return location.replace(lineAndColumnPattern, "");
}

/**
 * The sanitized name of the extension whose code called the wrapper, read off
 * a Chromium `Error.stack` captured **inside** the wrapper: the first frame is
 * the wrapper itself, and the second is its immediate caller. `undefined` when
 * that caller is not at a `freelens-extension://extensions/<name>/` URL.
 */
export function extensionCallingRequire(stack: string | undefined): string | undefined {
  const frames = (stack ?? "").split("\n").filter((line) => line.trim().startsWith("at "));
  const location = frames[1] === undefined ? undefined : frameLocation(frames[1]);

  if (!location?.startsWith(`${extensionSchemeOrigin}/`)) {
    return undefined;
  }

  return parseExtensionFileUrl(location)?.sanitizedName;
}

/**
 * What the wrapper does with each call: warn if an extension made it, once per
 * extension and module id.
 */
export function createRequireDeprecationWarning(
  logger: Logger,
): (stack: string | undefined, moduleId: unknown) => void {
  const warned = new Set<string>();

  return (stack, moduleId) => {
    const extension = extensionCallingRequire(stack);

    if (extension === undefined) {
      return;
    }

    const key = `${extension}\0${String(moduleId)}`;

    if (warned.has(key)) {
      return;
    }

    warned.add(key);
    logger.warn(
      `[EXTENSIONS]: extension "${extension}" called require(${JSON.stringify(moduleId)}) in the renderer. ` +
        "Renderer code gets no guarantee of Node or Electron, and require() may disappear in any release; " +
        'see "Node and Electron in the renderer" in the extension migration guide.',
    );
  };
}

const installed = Symbol.for("freelens.requireDeprecationWarning");

type RequireFunction = ((...args: unknown[]) => unknown) & { [installed]?: true };

/**
 * Replace `target.require` with a wrapper that reports each call's stack and
 * module id to `warn`, then returns what the original returns. The wrapper
 * carries the original's own properties (`resolve`, `cache`, …) so it stays a
 * drop-in.
 *
 * Does nothing when there is no `require` to wrap, when it is already wrapped,
 * or when the property cannot be replaced.
 */
export function installRequireDeprecationWarning(
  target: object,
  warn: (stack: string | undefined, moduleId: unknown) => void,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(target, "require");
  const original = descriptor?.value as RequireFunction | undefined;

  if (typeof original !== "function" || original[installed] || !(descriptor?.writable || descriptor?.configurable)) {
    return;
  }

  const wrapper: RequireFunction = function (this: unknown, ...args: unknown[]) {
    // Two frames are all the decision reads: the wrapper and its caller.
    const stackTraceLimit = Error.stackTraceLimit;

    Error.stackTraceLimit = 2;

    const { stack } = new Error();

    Error.stackTraceLimit = stackTraceLimit;
    warn(stack, args[0]);

    return original.apply(this, args);
  };

  Object.assign(wrapper, original);
  wrapper[installed] = true;

  Object.defineProperty(target, "require", { ...descriptor, value: wrapper });
}
