/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Logger } from "@freelensapp/logger";

import type WebSocket from "ws";

/**
 * A signal aborted once the terminal's websocket closes.
 *
 * The socket is open from the moment it is upgraded, but its shell starts only
 * after a series of awaits, and `close` fires once: a tab closed during that
 * stretch goes unnoticed by anything that starts listening later. Take the
 * signal synchronously when the socket is handed over, before the first await.
 */
export const websocketClosedSignal = (websocket: WebSocket): AbortSignal => {
  const controller = new AbortController();

  websocket.once("close", () => controller.abort());

  return controller.signal;
};

/**
 * Whether the start of a shell stops here because its terminal has closed,
 * logging the stage it closed during if so. Nothing would ever stop what is
 * started past this point for a closed terminal.
 */
export const closedDuring = (signal: AbortSignal, logger: Logger, terminalId: string, stage: string): boolean => {
  if (!signal.aborted) {
    return false;
  }

  logger.info(`[SHELL-SESSION]: terminal ${terminalId} closed while ${stage}, not starting its shell`);

  return true;
};
