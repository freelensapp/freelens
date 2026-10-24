/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import { Notice } from "../../extensions/notice";

import type { KeyboardEvent } from "react";

import type { OpenConfirmDialog } from "../../confirm-dialog/open.injectable";
import type { EditResourceModel } from "./edit-resource-model/edit-resource-model.injectable";

export interface EditorDiffToolbarProps {
  model: EditResourceModel;
  openConfirmDialog: OpenConfirmDialog;
}

export const EditorDiffToolbar = observer(({ model, openConfirmDialog }: EditorDiffToolbarProps) => (
  <>
    <div role="toolbar" aria-label="Resource editor changes" className="flex flex-wrap items-center gap-2 p-2">
      <Button
        label="Diff"
        aria-pressed={model.diffVisible.get()}
        title="Toggle diff (Cmd/Ctrl+Shift+D)"
        onClick={model.toggleDiff}
      />
      <Button
        label={model.sideBySide.get() ? "Side by side" : "Inline"}
        aria-label="Side by side diff"
        aria-pressed={model.sideBySide.get()}
        disabled={!model.diffVisible.get()}
        onClick={() => runInAction(() => model.sideBySide.set(!model.sideBySide.get()))}
      />
      <Button
        label="Revert"
        disabled={!model.hasChanges}
        onClick={() =>
          openConfirmDialog({
            message: "Discard your unsaved edits and restore the loaded baseline?",
            labelOk: "Revert",
            labelCancel: "Cancel",
            ok: model.revert,
          })
        }
      />
      <span role="status" title="Inserted plus deleted lines; a replacement counts as two lines.">
        {model.changedLines} changed lines
      </span>
      <Button
        label={model.reloading.get() ? "Reloading…" : "Reload baseline"}
        disabled={model.reloading.get()}
        onClick={model.reloadBaseline}
      />
      {model.comparingServer.get() && (
        <Button label="Compare with baseline" onClick={() => runInAction(() => model.comparingServer.set(false))} />
      )}
      {model.diffVisible.get() && <span>{model.comparingServer.get() ? "Server" : "Baseline"} → Draft</span>}
    </div>
    {model.hasServerChanges && (
      <Notice>
        <div>This resource changed on the cluster since you opened it.</div>
        <div>Your draft and loaded baseline have been kept.</div>
        <div>
          <Button label="Compare draft with server" onClick={model.compareServer} />
          <Button label="Use server as baseline" onClick={model.acceptServerBaseline} />
        </div>
      </Notice>
    )}
    {model.reloadError.get() && <Notice>{model.reloadError.get()}</Notice>}
  </>
));

// Capture before Monaco handles the keystroke; only the focused resource tab receives it.
export function handleEditorDiffShortcut(event: KeyboardEvent, toggleDiff: () => void) {
  if (event.code === "KeyD" && (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey) {
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) toggleDiff();
  }
}
