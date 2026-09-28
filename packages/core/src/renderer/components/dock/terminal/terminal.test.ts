/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import EventEmitter from "node:events";
import { computed } from "mobx";
import { Terminal } from "./terminal";
import { getMacNaturalTextEditingMapping, handleMacNaturalTextEditingKey } from "./terminal-key-mapping";

import type { Logger } from "@freelensapp/logger";

import type { TerminalApi } from "../../../api/terminal-api";

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

describe("Terminal status lines", () => {
  const erase = "\u001b[2K\r";
  const infoLine = `${erase}\u001b[90mStarting shell ...\u001b[0m`;
  const errorLine = `${erase}\u001b[31mFailed to download kubectl\u001b[0m\r\n`;

  let api: EventEmitter;
  let terminal: Terminal;
  let written: string[];
  let cleared: number;

  const createTerminal = () => {
    // xterm queries the device pixel ratio through matchMedia, which jsdom
    // does not implement.
    window.matchMedia ??= (() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    api = Object.assign(new EventEmitter(), {
      isReady: false,
      sendTerminalSize: vi.fn(),
      sendMessage: vi.fn(),
    });

    const spawningPool = document.createElement("div");

    document.body.appendChild(spawningPool);

    return new Terminal(
      {
        spawningPool,
        terminalConfig: computed(() => ({ fontSize: 12, fontFamily: "monospace" })),
        terminalCopyOnSelect: computed(() => false),
        terminalFonts: [],
        isMac: false,
        xtermColorTheme: computed(() => ({})),
        logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } as unknown as Logger,
        openLinkInBrowser: vi.fn(),
      },
      { tabId: "some-tab-id", api: api as unknown as TerminalApi },
    );
  };

  beforeEach(() => {
    written = [];
    cleared = 0;

    terminal = createTerminal();

    // The private xterm instance is what every status line is written to.
    const xterm = (terminal as unknown as { xterm: { write: unknown; clear: unknown } }).xterm;

    xterm.write = (data: string, callback?: () => void) => {
      written.push(data);
      callback?.();
    };
    xterm.clear = () => {
      cleared += 1;
    };
  });

  afterEach(() => {
    terminal.destroy();
  });

  it("erases the transient line and clears the buffer once the session is ready", () => {
    api.emit("status", infoLine, "info");
    api.emit("ready");

    expect(written).toEqual([infoLine, erase]);
    expect(cleared).toBe(1);
  });

  it("keeps a reported error above the prompt by not clearing the buffer", () => {
    api.emit("status", errorLine, "error");
    api.emit("status", infoLine, "info");
    api.emit("ready");

    expect(written).toEqual([errorLine, infoLine, erase]);
    expect(cleared).toBe(0);
  });

  it("clears the buffer only once, however the session becomes ready", () => {
    api.emit("ready");
    api.emit("connected");

    expect(cleared).toBe(1);
  });
});
