/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { computed } from "mobx";
import { expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import rendererExtensionsInjectable from "../../../extensions/renderer-extensions.injectable";
import { renderFor } from "../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import { debugTestPod } from "../test-utils";
import { DebugContainerDialogContent } from "./dialog";
import { DebugContainerDialogState } from "./dialog-state";

const renderDialog = () => {
  const openTerminal = vi.fn();
  const state = new DebugContainerDialogState({
    getDefaultImage: () => "alpine:latest",
    randomId: () => "123",
    openTerminal,
  });

  state.open(debugTestPod());
  const di = getDiForUnitTesting();

  di.override(directoryForUserDataInjectable, () => "/test-user-data");
  di.override(rendererExtensionsInjectable, () => computed(() => []));
  renderFor(di)(<DebugContainerDialogContent state={state} />);

  return openTerminal;
};

it("starts kubectl debug with the image the user chose", async () => {
  const openTerminal = renderDialog();

  expect(screen.getByRole("textbox", { name: "Image" })).toHaveValue("alpine:latest");
  fireEvent.change(screen.getByRole("textbox", { name: "Image" }), { target: { value: "busybox:latest" } });
  fireEvent.click(screen.getByRole("button", { name: "Start debugging" }));
  await waitFor(() =>
    expect(openTerminal).toHaveBeenCalledWith(expect.objectContaining({ image: "busybox:latest", target: "app" })),
  );
});

it("adds a line rather than starting when Enter is pressed in an editor", async () => {
  const openTerminal = renderDialog();
  const env = screen.getByTestId("monaco-editor-for-debug-container-env");

  fireEvent.change(env, { target: { value: "A: 1\nB: 2" } });
  fireEvent.keyDown(env, { key: "Enter" });
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(openTerminal).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Start debugging" }));
  await waitFor(() => expect(openTerminal).toHaveBeenCalledWith(expect.objectContaining({ env: ["A=1", "B=2"] })));
});
