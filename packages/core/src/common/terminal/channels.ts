/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export enum TerminalChannels {
  STDIN = "stdin",
  STDOUT = "stdout",
  STATUS = "status",
  CONNECTED = "connected",
  RESIZE = "resize",
  PING = "ping",
}

/**
 * How a {@link TerminalChannels.STATUS} frame occupies the terminal.
 *
 * `info` is transient: the next frame overwrites it and it is erased once the
 * session is ready. `error` is sticky: it keeps its line and whatever comes
 * next starts below it.
 */
export type TerminalStatusLevel = "info" | "error";

export type TerminalMessage =
  | {
      type: TerminalChannels.STDIN;
      data: string;
    }
  | {
      type: TerminalChannels.STDOUT;
      data: string;
    }
  | {
      type: TerminalChannels.STATUS;
      data: {
        /** single line, no newlines */
        message: string;
        /** "info" is overwritten by the next frame; "error" stays and is followed by a fresh line */
        level: TerminalStatusLevel;
      };
    }
  | {
      type: TerminalChannels.CONNECTED;
    }
  | {
      type: TerminalChannels.RESIZE;
      data: {
        width: number;
        height: number;
      };
    }
  | {
      type: TerminalChannels.PING;
    };
