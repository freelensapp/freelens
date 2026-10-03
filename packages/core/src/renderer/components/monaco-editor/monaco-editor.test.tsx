/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { editor } from "monaco-editor";
import React from "react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { MonacoEditor } from "./monaco-editor";

import type { DiRender } from "../test-utils/renderFor";

// vitest.setup.tsx replaces this component with a textarea for every other test.
vi.unmock("./monaco-editor");

interface FakeEditor {
  value: string;
  disposed: boolean;
  setValue: (value: string) => void;
  dispose: () => void;
}

const createFakeEditor = (containerElem: HTMLElement): FakeEditor => {
  const fakeEditor = {
    value: "",
    disposed: false,
    getValue: () => fakeEditor.value,
    setValue: vi.fn((value: string) => {
      fakeEditor.value = value;
    }),
    dispose: vi.fn(() => {
      fakeEditor.disposed = true;
    }),
    getContainerDomNode: () => containerElem,
    onDidLayoutChange: () => ({ dispose: () => {} }),
    onDidChangeModelContent: () => ({ dispose: () => {} }),
    onDidContentSizeChange: () => ({ dispose: () => {} }),
    saveViewState: () => null,
    restoreViewState: () => {},
    setModel: () => {},
    updateOptions: () => {},
    layout: () => {},
    focus: () => {},
  };

  return fakeEditor;
};

describe("<MonacoEditor />", () => {
  let render: DiRender;
  let fakeEditors: FakeEditor[];

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    fakeEditors = [];

    const model = { uri: { path: "/monaco-editor/some-id" }, getLineCount: () => 1 };

    vi.mocked(editor.getModel).mockReturnValue(model as unknown as editor.ITextModel);
    vi.mocked(editor.create).mockReset();
    vi.mocked(editor.create).mockImplementation((containerElem) => {
      const fakeEditor = createFakeEditor(containerElem);

      fakeEditors.push(fakeEditor);

      return fakeEditor as unknown as editor.IStandaloneCodeEditor;
    });
  });

  describe("when mounted under React.StrictMode", () => {
    let rerender: (ui: React.ReactNode) => void;
    let unmount: () => void;

    beforeEach(() => {
      ({ rerender, unmount } = render(
        <React.StrictMode>
          <MonacoEditor id="some-id" theme="vs" value="some-value" />
        </React.StrictMode>,
      ));
    });

    it("creates a new editor after the remount", () => {
      expect(fakeEditors.length).toBeGreaterThanOrEqual(2);
    });

    it("disposes every editor but the last one", () => {
      expect(fakeEditors.slice(0, -1).every((fakeEditor) => fakeEditor.disposed)).toBe(true);
      expect(fakeEditors.at(-1)?.disposed).toBe(false);
    });

    it("shows the value in the last editor", () => {
      expect(fakeEditors.at(-1)?.value).toBe("some-value");
    });

    it("updates the last editor when the value changes", () => {
      rerender(
        <React.StrictMode>
          <MonacoEditor id="some-id" theme="vs" value="some-other-value" />
        </React.StrictMode>,
      );

      expect(fakeEditors.at(-1)?.value).toBe("some-other-value");
    });

    it("disposes the last editor when unmounted", () => {
      unmount();

      expect(fakeEditors.at(-1)?.disposed).toBe(true);
    });
  });
});
