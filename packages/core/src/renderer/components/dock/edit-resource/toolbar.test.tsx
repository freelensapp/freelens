/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { observable } from "mobx";
import { describe, expect, it, vi } from "vitest";
import { EditResourceModel } from "./edit-resource-model/edit-resource-model.injectable";
import { EditorDiffToolbar, handleEditorDiffShortcut } from "./toolbar";

import type { ConfirmDialogParams } from "../../confirm-dialog/confirm-dialog";
import type { EditResourceTabStore } from "./store";

function setup(draft = "name: edited\n") {
  const data = observable({ resource: "/resource", firstDraft: "name: original\n", draft });
  const model = new EditResourceModel({
    store: { getData: () => data } as unknown as EditResourceTabStore,
    tabId: "tab",
    requestKubeResource: vi.fn(async () => ({ callWasSuccessful: false as const, error: "offline" })),
    requestPatchKubeResource: vi.fn(),
    waitForEditingResource: async () => data,
    showErrorNotification: vi.fn(),
    showSuccessNotification: vi.fn(),
  });
  const openConfirmDialog = vi.fn<(params: ConfirmDialogParams) => void>();

  render(
    <div data-testid="editor" onKeyDownCapture={(event) => handleEditorDiffShortcut(event, model.toggleDiff)}>
      <EditorDiffToolbar model={model} openConfirmDialog={openConfirmDialog} />
    </div>,
  );

  return { model, openConfirmDialog };
}

describe("resource editor toolbar", () => {
  it("renders changes and toggles diff and layout", () => {
    const { model } = setup();
    expect(screen.getByRole("toolbar", { name: "Resource editor changes" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 changed lines");
    expect(screen.getByRole("button", { name: "Side by side diff" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Diff" }));
    expect(model.diffVisible.get()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Side by side diff" }));
    expect(model.sideBySide.get()).toBe(false);
  });

  it("only reverts after the confirmation is accepted", () => {
    const { model, openConfirmDialog } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Revert" }));
    expect(model.configuration.value.get()).toBe("name: edited\n");
    expect(openConfirmDialog).toHaveBeenCalledTimes(1);
    act(() => {
      openConfirmDialog.mock.calls[0][0].ok?.();
    });
    expect(model.configuration.value.get()).toBe("name: original\n");
    expect(screen.getByRole("button", { name: "Revert" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("0 changed lines");
  });

  it("does not ask to revert an unchanged draft", () => {
    const { openConfirmDialog } = setup("name: original\n");
    fireEvent.click(screen.getByRole("button", { name: "Revert" }));
    expect(openConfirmDialog).not.toHaveBeenCalled();
  });

  it("shows the three-line server notice and allows either comparison", () => {
    const { model } = setup();
    act(() => {
      model.serverYaml.set("name: server\n");
    });
    expect(screen.getByText("This resource changed on the cluster since you opened it.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Compare draft with server" }));
    expect(model.comparisonYaml).toBe("name: server\n");
    expect(model.diffVisible.get()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Compare with baseline" }));
    expect(model.comparisonYaml).toBe("name: original\n");
  });

  it.each(["metaKey", "ctrlKey"])("toggles with %s+Shift+D but ignores repeats and other chords", (modifier) => {
    const { model } = setup();
    const target = screen.getByTestId("editor");
    fireEvent.keyDown(target, { code: "KeyD", shiftKey: true, [modifier]: true });
    expect(model.diffVisible.get()).toBe(true);
    fireEvent.keyDown(target, { code: "KeyD", shiftKey: true, [modifier]: true, repeat: true });
    fireEvent.keyDown(target, { code: "KeyD", [modifier]: true });
    fireEvent.keyDown(target, { code: "KeyD", shiftKey: true, [modifier]: true, altKey: true });
    expect(model.diffVisible.get()).toBe(true);
    fireEvent.keyDown(target, { code: "KeyD", shiftKey: true, [modifier]: true });
    expect(model.diffVisible.get()).toBe(false);
  });

  it("shows a reload error without discarding the draft", async () => {
    const { model } = setup();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reload baseline" }));
    });
    expect(screen.getByText("Loading resource failed: offline")).toBeInTheDocument();
    expect(model.configuration.value.get()).toBe("name: edited\n");
  });
  it("adopts the server baseline only when requested", () => {
    const { model } = setup();
    act(() => {
      model.serverYaml.set("name: server\n");
    });
    expect(model.baseline).toBe("name: original\n");
    fireEvent.click(screen.getByRole("button", { name: "Use server as baseline" }));
    expect(model.baseline).toBe("name: server\n");
    expect(model.configuration.value.get()).toBe("name: edited\n");
    expect(screen.queryByRole("button", { name: "Compare draft with server" })).not.toBeInTheDocument();
  });
});
