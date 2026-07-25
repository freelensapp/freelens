/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

interface TerminalKeyMapping {
  data: string;
}

export type SendTerminalData = (data: string) => void;

export const getMacNaturalTextEditingMapping = (evt: KeyboardEvent): TerminalKeyMapping | undefined => {
  if (evt.type !== "keydown") {
    return undefined;
  }

  if (evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey) {
    switch (evt.code) {
      case "ArrowLeft":
        return { data: "\x1bb" };
      case "ArrowRight":
        return { data: "\x1bf" };
    }
  }

  if (evt.metaKey && !evt.altKey && !evt.ctrlKey && !evt.shiftKey && evt.code === "Backspace") {
    return { data: "\x15" };
  }

  return undefined;
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
