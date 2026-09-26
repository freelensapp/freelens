/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { computed } from "mobx";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import rendererExtensionsInjectable from "../../../extensions/renderer-extensions.injectable";
import { renderFor } from "../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import { debugTestPod } from "../test-utils";
import { DebugContainerDialogContent } from "./dialog";
import { DebugContainerDialogState } from "./dialog-state";

it("lets the user choose an image and explains the persistent lifecycle", async () => {
  const create = vi.fn().mockRejectedValue(new Error("admission denied"));
  const state = new DebugContainerDialogState({
    client: { permissions: async () => ({ create: true, exec: true }), create, stop: vi.fn() },
    podApi: { get: vi.fn() },
    randomId: () => "123",
    openShell: vi.fn(),
    delay: vi.fn(),
  });
  await state.open(debugTestPod());
  const di = getDiForUnitTesting();
  di.override(directoryForUserDataInjectable, () => "/test-user-data");
  di.override(rendererExtensionsInjectable, () => computed(() => []));
  renderFor(di)(<DebugContainerDialogContent state={state} />);
  expect(screen.getByText(/Closing the terminal leaves the debug container running/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Debug image" }), { target: { value: "busybox:latest" } });
  fireEvent.click(screen.getByRole("button", { name: "Start debugging" }));
  await waitFor(() =>
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ image: "busybox:latest", targetContainerName: "app" }),
    ),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("admission denied");
  expect(screen.getByRole("button", { name: "Retry connection" })).toBeEnabled();
});
