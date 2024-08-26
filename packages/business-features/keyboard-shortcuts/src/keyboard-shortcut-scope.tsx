import type { StrictReactNode } from "@freelensapp/utilities";
import React from "react";

export interface KeyboardShortcutScopeProps {
  id: string;
  children: StrictReactNode;
}

export const KeyboardShortcutScope = ({ id, children }: KeyboardShortcutScopeProps) => (
  <div data-keyboard-shortcut-scope={id} data-keyboard-shortcut-scope-test={id} tabIndex={-1}>
    {children}
  </div>
);
