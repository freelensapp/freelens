/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describeExtensionLoadStage } from "../../../extensions/extension-loader/load-failure";

import type { ExtensionLoadFailureInProcess } from "../../../extensions/extension-loader/load-failure";
import type { InstalledExtension } from "../../../extensions/installed-extension";

export type ExtensionStatus = "Enabled" | "Disabled" | "Incompatible" | "Failed to load";

/**
 * A failure is only reported for an extension the user wants to run: disabling
 * it is what takes the failure away.
 */
export const getExtensionStatus = (
  extension: InstalledExtension,
  loadFailures: ExtensionLoadFailureInProcess[],
): ExtensionStatus => {
  if (!extension.isCompatible) {
    return "Incompatible";
  }

  if (!extension.isEnabled) {
    return "Disabled";
  }

  return loadFailures.length > 0 ? "Failed to load" : "Enabled";
};

export const describeLoadFailures = (loadFailures: ExtensionLoadFailureInProcess[]) =>
  loadFailures
    .map(
      ({ process, stage, message }) =>
        `Failed in the ${process} process while ${describeExtensionLoadStage(stage)}: ${message}`,
    )
    .join("\n");
