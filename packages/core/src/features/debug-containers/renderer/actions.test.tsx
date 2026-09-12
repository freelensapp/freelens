/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { buildDebugContainer } from "../common/debug-container";
import { debugRequest, debugTestPod } from "../test-utils";
import { DebugContainerActionsContent } from "./actions";

describe("debug container controls", () => {
  const client = { permissions: vi.fn(), create: vi.fn(), stop: vi.fn() };
  const openShell = vi.fn();
  const confirm = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    client.permissions.mockResolvedValue({ create: false, exec: true });
  });

  const renderControls = (container = buildDebugContainer(debugRequest)) =>
    render(
      <DebugContainerActionsContent
        pod={debugTestPod({ running: { startedAt: "now" } })}
        container={container}
        client={client}
        openShell={openShell}
        confirm={confirm}
      />,
    );

  it("reconnects to a persisted debugger with exec permission even without creation permission", async () => {
    renderControls();
    await waitFor(() => expect(screen.getByRole("button", { name: "Open debug shell" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Open debug shell" }));
    expect(openShell).toHaveBeenCalledWith({
      namespace: "default",
      name: "app",
      uid: "pod-uid",
      containerName: "freelens-debug-123",
    });
    expect(client.create).not.toHaveBeenCalled();
  });

  it("stops only after confirmation and displays a retryable error", async () => {
    client.stop.mockRejectedValue(new Error("permission revoked"));
    renderControls();
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop debugging" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Stop debugging" }));
    expect(client.stop).not.toHaveBeenCalled();
    await act(async () => confirm.mock.calls[0][0].ok());
    expect(client.stop).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "pod-uid", containerName: "freelens-debug-123" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("permission revoked");
    expect(screen.getByRole("button", { name: "Stop debugging" })).toBeEnabled();
  });

  it("does not stop on unmount", async () => {
    const { unmount } = renderControls();
    await waitFor(() => expect(screen.getByRole("button", { name: "Open debug shell" })).toBeEnabled());
    unmount();
    expect(client.stop).not.toHaveBeenCalled();
  });

  it("does not offer lifecycle controls for an unrelated ephemeral container", () => {
    renderControls({ name: "manual-debugger", image: "alpine" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(client.permissions).not.toHaveBeenCalled();
  });
});
