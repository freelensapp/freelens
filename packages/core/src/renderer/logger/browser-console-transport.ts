/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { setImmediate } from "node:timers";
import TransportStream from "winston-transport";

import type { LogEntry } from "winston";

/**
 * The symbol under which winston keeps the arguments that followed the message.
 *
 * This is the same symbol as `triple-beam`'s `SPLAT`, spelled out so that the
 * renderer does not have to import a CommonJS package for one well-known
 * symbol.
 */
const SPLAT = Symbol.for("splat");

/**
 * Fields that winston puts on every entry, and which the printed message
 * already accounts for.
 */
const builtinFields = new Set(["level", "message", "timestamp"]);

const consoleMethodFor = (level: string): "debug" | "error" | "info" | "warn" => {
  switch (level) {
    case "error":
      return "error";
    case "warn":
      return "warn";
    case "debug":
    case "verbose":
    case "silly":
      return "debug";
    default:
      return "info";
  }
};

/**
 * The metadata to show next to the message.
 *
 * `format.splat()` leaves a single trailing argument in place, but moves two or
 * more of them onto the entry itself as own properties. Prefer the former,
 * because it preserves object identity and so keeps an `Error` inspectable in
 * the devtools console; fall back to the latter, which is the only place the
 * data exists in the multiple-argument case.
 */
const metadataOf = (entry: LogEntry): unknown[] => {
  const splat = (entry as unknown as Record<symbol, unknown>)[SPLAT];

  if (Array.isArray(splat) && splat.length > 0) {
    return splat;
  }

  const fields = Object.entries(entry).filter(([field]) => !builtinFields.has(field));

  return fields.length > 0 ? [Object.fromEntries(fields)] : [];
};

/**
 * Writes log entries to the browser console, mapping the winston level onto the
 * matching `console` method so that the devtools level filter works.
 *
 * Replaces `winston-transport-browserconsole`, which was last released in
 * 2020-03, is CommonJS-only -- which needed an interop workaround in the
 * renderer bundle -- and dropped the metadata of any entry logged with more
 * than one argument.
 */
export class BrowserConsoleTransport extends TransportStream {
  name = "browser-console-transport";

  log(entry: LogEntry, next: () => void) {
    setImmediate(() => {
      this.emit("logged", entry);
    });

    console[consoleMethodFor(entry.level)](entry.message, ...metadataOf(entry));

    next();
  }
}
