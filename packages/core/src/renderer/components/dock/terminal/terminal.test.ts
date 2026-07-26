/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMacNaturalTextEditingMapping, handleMacNaturalTextEditingKey } from "./terminal-key-mapping";

const keyDown = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
const keyUp = (init: KeyboardEventInit) => new KeyboardEvent("keyup", init);

describe("getMacNaturalTextEditingMapping", () => {
  it("maps Option+ArrowLeft to backward-word", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ altKey: true, code: "ArrowLeft" }))).toEqual({
      data: "\x1bb",
    });
  });

  it("maps Option+ArrowRight to forward-word", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ altKey: true, code: "ArrowRight" }))).toEqual({
      data: "\x1bf",
    });
  });

  it("maps Option+Delete to forward kill-word", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ altKey: true, code: "Delete" }))).toEqual({
      data: "\x1bd",
    });
  });

  it("maps Command+ArrowLeft to beginning-of-line", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "ArrowLeft" }))).toEqual({
      data: "\x01",
    });
  });

  it("maps Command+ArrowRight to end-of-line", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "ArrowRight" }))).toEqual({
      data: "\x05",
    });
  });

  it("maps Command+Backspace to line kill", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "Backspace" }))).toEqual({
      data: "\x15",
    });
  });

  it("maps Command+Delete to forward kill-line", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "Delete" }))).toEqual({
      data: "\x0b",
    });
  });

  it("does not map Option+Backspace, which xterm already prefixes with ESC for backward-kill-word", () => {
    expect(getMacNaturalTextEditingMapping(keyDown({ altKey: true, code: "Backspace" }))).toBeUndefined();
  });

  it("does not map unrelated key events", () => {
    expect(getMacNaturalTextEditingMapping(keyUp({ altKey: true, code: "ArrowLeft" }))).toBeUndefined();
    expect(getMacNaturalTextEditingMapping(keyDown({ altKey: true, code: "ArrowUp" }))).toBeUndefined();
    expect(getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "ArrowUp" }))).toBeUndefined();
    expect(getMacNaturalTextEditingMapping(keyDown({ code: "ArrowLeft" }))).toBeUndefined();
    expect(getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "KeyK" }))).toBeUndefined();
  });

  it("requires an exact modifier match", () => {
    expect(
      getMacNaturalTextEditingMapping(keyDown({ altKey: true, code: "ArrowLeft", shiftKey: true })),
    ).toBeUndefined();
    expect(
      getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "ArrowLeft", shiftKey: true })),
    ).toBeUndefined();
    expect(
      getMacNaturalTextEditingMapping(keyDown({ metaKey: true, code: "ArrowRight", ctrlKey: true })),
    ).toBeUndefined();
    expect(getMacNaturalTextEditingMapping(keyDown({ altKey: true, code: "Delete", metaKey: true }))).toBeUndefined();
  });
});

describe("handleMacNaturalTextEditingKey", () => {
  it("prevents xterm's default handling and sends the mapped data", () => {
    const sendData = vi.fn();
    const event = keyDown({ altKey: true, code: "ArrowLeft" });
    const preventDefault = vi.spyOn(event, "preventDefault");

    expect(handleMacNaturalTextEditingKey(event, sendData)).toBe(false);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(sendData).toHaveBeenCalledExactlyOnceWith("\x1bb");
  });

  it("allows xterm to handle unmapped keys", () => {
    const sendData = vi.fn();
    const event = keyDown({ code: "ArrowLeft" });
    const preventDefault = vi.spyOn(event, "preventDefault");

    expect(handleMacNaturalTextEditingKey(event, sendData)).toBe(true);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(sendData).not.toHaveBeenCalled();
  });
});
