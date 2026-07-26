/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

interface TerminalKeyMapping {
  data: string;
}

export type SendTerminalData = (data: string) => void;

const Modifier = {
  Alt: 1 << 0,
  Ctrl: 1 << 1,
  Meta: 1 << 2,
  Shift: 1 << 3,
} as const;

const modifiersOf = (evt: KeyboardEvent): number =>
  (evt.altKey ? Modifier.Alt : 0) |
  (evt.ctrlKey ? Modifier.Ctrl : 0) |
  (evt.metaKey ? Modifier.Meta : 0) |
  (evt.shiftKey ? Modifier.Shift : 0);

const mappingKey = (modifiers: number, code: string): string => `${modifiers}:${code}`;

/**
 * iTerm2's "Natural Text Editing" preset, limited to sequences that zsh and
 * readline bind by default in emacs mode, so that no user configuration is
 * required.
 *
 * The modifiers are matched exactly: shifted variants such as
 * Option+Shift+ArrowLeft are selection gestures that a shell line editor cannot
 * express, so they are left to xterm.js.
 *
 * Option+Backspace is intentionally absent. xterm.js already prefixes Backspace
 * with ESC when Alt is held, and zsh binds `\e^?` to `backward-kill-word` by
 * default, so mapping it here would be a no-op at best.
 *
 * Command+ArrowLeft sends Ctrl-A, which is also the default tmux prefix, so a
 * tmux session running inside the terminal will swallow it instead of moving
 * the cursor. iTerm2 behaves identically, so this is accepted rather than
 * worked around.
 */
const macNaturalTextEditingMappings = new Map<string, string>([
  [mappingKey(Modifier.Alt, "ArrowLeft"), "\x1bb"], // backward-word
  [mappingKey(Modifier.Alt, "ArrowRight"), "\x1bf"], // forward-word
  [mappingKey(Modifier.Alt, "Delete"), "\x1bd"], // kill-word (forward)
  [mappingKey(Modifier.Meta, "ArrowLeft"), "\x01"], // beginning-of-line
  [mappingKey(Modifier.Meta, "ArrowRight"), "\x05"], // end-of-line
  [mappingKey(Modifier.Meta, "Backspace"), "\x15"], // backward-kill-line
  [mappingKey(Modifier.Meta, "Delete"), "\x0b"], // kill-line (forward)
]);

export const getMacNaturalTextEditingMapping = (evt: KeyboardEvent): TerminalKeyMapping | undefined => {
  if (evt.type !== "keydown") {
    return undefined;
  }

  const data = macNaturalTextEditingMappings.get(mappingKey(modifiersOf(evt), evt.code));

  return data ? { data } : undefined;
};

export const handleMacNaturalTextEditingKey = (evt: KeyboardEvent, sendData: SendTerminalData): boolean => {
  const mapping = getMacNaturalTextEditingMapping(evt);

  if (!mapping) {
    return true;
  }

  evt.preventDefault();
  sendData(mapping.data);

  return false;
};
