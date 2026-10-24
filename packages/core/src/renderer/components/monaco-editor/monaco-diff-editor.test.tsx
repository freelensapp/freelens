/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, render } from "@testing-library/react";
import { computed, observable } from "mobx";
import { editor } from "monaco-editor";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NonInjectedMonacoDiffEditor } from "./monaco-diff-editor";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { LensTheme } from "../../themes/lens-theme";

vi.unmock("./monaco-editor");

function textModel(initial: string) {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    getValue: () => value,
    setValue: vi.fn((next: string) => {
      value = next;
      listeners.forEach((listener) => listener());
    }),
    onDidChangeContent: (listener: () => void) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    },
    dispose: vi.fn(),
  };
}

function setup(existingDraft = true) {
  const draft = textModel("name: draft\n");
  const original = textModel("name: baseline\n");
  const focus = vi.fn();
  const diff = {
    setModel: vi.fn(),
    updateOptions: vi.fn(),
    getModifiedEditor: () => ({ focus }),
    dispose: vi.fn(),
  };
  const theme = observable.box("vs-dark");
  const props = {
    id: "resource-tab",
    original: "name: baseline\n",
    value: "name: draft\n",
    sideBySide: true,
    onChange: vi.fn(),
    onError: vi.fn(),
    state: observable({ editorConfiguration: { fontSize: 16 } }) as unknown as UserPreferencesState,
    activeTheme: computed(() => ({ monacoTheme: theme.get() }) as LensTheme),
  };

  vi.mocked(editor.getModel).mockReturnValue(existingDraft ? (draft as unknown as editor.ITextModel) : null);
  vi.mocked(editor.createModel).mockReturnValue(original as unknown as editor.ITextModel);
  vi.mocked(editor.createDiffEditor).mockReturnValue(diff as unknown as editor.IStandaloneDiffEditor);
  if (!existingDraft) {
    vi.mocked(editor.createModel).mockReturnValueOnce(draft as unknown as editor.ITextModel);
  }
  const view = render(<NonInjectedMonacoDiffEditor {...props} />);

  return { ...view, props, theme, draft, original, diff, focus };
}

describe("Monaco resource diff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shares the existing draft, locks the baseline and applies editor preferences", () => {
    const { draft, original, diff, focus } = setup();
    expect(editor.getModel).toHaveBeenCalledWith({ path: "/monaco-editor/resource-tab" });
    expect(diff.setModel).toHaveBeenCalledWith({ original, modified: draft });
    expect(editor.createDiffEditor).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        automaticLayout: true,
        ignoreTrimWhitespace: false,
        originalEditable: false,
        readOnly: false,
        renderSideBySide: true,
        fontSize: 16,
        theme: "vs-dark",
      }),
    );
    expect(focus).toHaveBeenCalled();
  });

  it("sends edits and validation errors through the existing draft callbacks", () => {
    const { draft, props } = setup();
    act(() => {
      draft.setValue("name: edited\n");
    });
    expect(props.onChange).toHaveBeenLastCalledWith("name: edited\n");
    act(() => {
      draft.setValue("name: [\n");
    });
    expect(props.onError).toHaveBeenCalled();
  });

  it("updates theme, layout and baseline without recreating the draft", () => {
    const { props, theme, original, draft, diff, rerender } = setup();
    act(() => {
      theme.set("vs");
    });
    expect(editor.setTheme).toHaveBeenLastCalledWith("vs");
    rerender(<NonInjectedMonacoDiffEditor {...props} original={"name: server\n"} sideBySide={false} />);
    expect(original.getValue()).toBe("name: server\n");
    expect(draft.getValue()).toBe("name: draft\n");
    expect(diff.updateOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ renderSideBySide: false, originalEditable: false }),
    );
    expect(editor.createDiffEditor).toHaveBeenCalledTimes(1);
    rerender(<NonInjectedMonacoDiffEditor {...props} value={"name: reverted\n"} />);
    expect(draft.getValue()).toBe("name: reverted\n");
  });

  it("disposes the diff, original and listener but keeps the dock draft alive", () => {
    const { draft, original, diff, props, unmount } = setup();
    unmount();
    expect(diff.dispose).toHaveBeenCalledTimes(1);
    expect(original.dispose).toHaveBeenCalledTimes(1);
    expect(draft.dispose).not.toHaveBeenCalled();
    draft.setValue("after unmount");
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("creates a draft with the plain editor URI when no model exists", () => {
    const { draft, original, diff } = setup(false);
    expect(editor.createModel).toHaveBeenNthCalledWith(1, "name: draft\n", "yaml", {
      path: "/monaco-editor/resource-tab",
    });
    expect(diff.setModel).toHaveBeenCalledWith({ original, modified: draft });
  });

  it("keeps the draft model and its contents when the diff is reopened", () => {
    const { props, draft, unmount } = setup();
    unmount();
    render(<NonInjectedMonacoDiffEditor {...props} />);
    expect(draft.setValue).not.toHaveBeenCalled();
    expect(draft.dispose).not.toHaveBeenCalled();
    expect(editor.createModel).toHaveBeenCalledTimes(2);
    expect(editor.createModel).toHaveBeenLastCalledWith(props.original, "yaml");
  });

  it("updates editor preferences without recreating the editor", () => {
    const { props, diff } = setup();
    act(() => {
      props.state.editorConfiguration.fontSize = 20;
    });
    expect(diff.updateOptions).toHaveBeenLastCalledWith(expect.objectContaining({ fontSize: 20 }));
    expect(editor.createDiffEditor).toHaveBeenCalledTimes(1);
  });
});
