/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

/**
 * Where the shell a terminal would start was found, if it was.
 */
export interface TerminalShellLookup {
  /** The shell the terminal would start: the setting, or the default shell when the setting is empty. */
  shell: string;
  /** The full path of the file the terminal would start, when there is one. */
  path?: string;
}

/**
 * Looks up the shell that the Terminal Shell Path setting names, given as the request; an empty setting stands for
 * the default shell.
 */
export const lookUpTerminalShellChannel = getRequestChannel<string, TerminalShellLookup>("look-up-terminal-shell");
