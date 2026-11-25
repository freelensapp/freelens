/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The step of loading an extension in one process which failed:
 *
 * - `import`: its entry point for the process could not be imported, because
 *   the file is missing or its evaluation threw;
 * - `instantiate`: the class it exports could not be constructed;
 * - `activate`: its `onActivate` threw or rejected;
 * - `enable`: enabling the instance rejected.
 *
 * A manifest without an entry point for the process is not a failure: the
 * extension has nothing to load there.
 */
export type ExtensionLoadStage = "import" | "instantiate" | "activate" | "enable";

export interface ExtensionLoadFailure {
  readonly stage: ExtensionLoadStage;
  readonly message: string;
}

/**
 * A failure together with the process it happened in, which is what a renderer
 * reports: its own failures and main's.
 */
export interface ExtensionLoadFailureInProcess extends ExtensionLoadFailure {
  readonly process: "main" | "renderer";
}

export const describeExtensionLoadStage = (stage: ExtensionLoadStage) => {
  switch (stage) {
    case "import":
      return "importing its entry point";
    case "instantiate":
      return "constructing the extension";
    case "activate":
      return "running onActivate";
    case "enable":
      return "enabling the extension";
  }
};

export const extensionLoadFailureMessageOf = (error: unknown) =>
  (error instanceof Error ? error.message : undefined) || String(error);
