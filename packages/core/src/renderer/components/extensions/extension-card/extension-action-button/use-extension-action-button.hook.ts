/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ExtensionActionState } from "./extension-action-button";

export interface UseExtensionActionButtonArgs {
  state: ExtensionActionState;
}

export interface UseExtensionActionButtonResult {
  label: string;
  /** Install and update are drawn as the primary button, uninstall as the accent one. */
  variant: "primary" | "accent";
  isSpinnerState: boolean;
}

const labelFor = (state: ExtensionActionState): string => {
  switch (state) {
    case "install":
    case "installing":
      return "Install";
    case "uninstall":
    case "uninstalling":
      return "Uninstall";
    case "update":
    case "updating":
      return "Update";
  }
};

export const useExtensionActionButton = ({ state }: UseExtensionActionButtonArgs): UseExtensionActionButtonResult => {
  const label = labelFor(state);
  const variant = state === "uninstall" || state === "uninstalling" ? "accent" : "primary";
  const isSpinnerState = state === "installing" || state === "uninstalling" || state === "updating";

  return { label, variant, isSpinnerState };
};
