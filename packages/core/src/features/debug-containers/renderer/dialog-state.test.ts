/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { debugRequest, debugTestPod } from "../test-utils";
import { DebugContainerDialogState } from "./dialog-state";

describe("debug container dialog", () => {
  const client = { permissions: vi.fn(), create: vi.fn(), stop: vi.fn() };
  const get = vi.fn();
  const openShell = vi.fn();
  const delay = vi.fn();
  let state: DebugContainerDialogState;

  beforeEach(async () => {
    vi.resetAllMocks();
    client.permissions.mockResolvedValue({ create: true, exec: true });
    get.mockResolvedValue(debugTestPod({ running: { startedAt: "now" } }));
    state = new DebugContainerDialogState({ client, podApi: { get }, openShell, delay, randomId: () => "123" });
    await state.open(debugTestPod());
  });

  it("waits for running status before opening a shell", async () => {
    get.mockResolvedValueOnce(debugTestPod({ waiting: { reason: "ContainerCreating", message: "Pulling image" } }));
    delay.mockImplementationOnce(() => {
      expect(openShell).not.toHaveBeenCalled();
      expect(state.status).toBe("Pulling image");
    });
    await state.start();
    expect(client.create).toHaveBeenCalledWith(debugRequest);
    expect(openShell).toHaveBeenCalledWith({
      namespace: "default",
      name: "app",
      uid: "pod-uid",
      containerName: "freelens-debug-123",
    });
    expect(state.pod).toBeUndefined();
    expect(client.stop).not.toHaveBeenCalled();
  });

  it("leaves the container running when dismissed during creation", async () => {
    client.create.mockImplementationOnce(async () => state.close());
    await state.start();
    expect(get).not.toHaveBeenCalled();
    expect(openShell).not.toHaveBeenCalled();
    expect(client.stop).not.toHaveBeenCalled();
  });

  it("does not connect a dismissed dialog when an in-flight read completes", async () => {
    get.mockImplementationOnce(async () => {
      state.close();
      return debugTestPod({ running: { startedAt: "now" } });
    });
    await state.start();
    expect(openShell).not.toHaveBeenCalled();
  });

  it("retains startup errors and retries the same container name", async () => {
    client.create.mockRejectedValueOnce(new Error("Connection lost"));
    await state.start();
    expect(state.error).toBe("Connection lost");
    expect(state.busy).toBe(false);
    await state.start();
    expect(client.create).toHaveBeenNthCalledWith(1, debugRequest);
    expect(client.create).toHaveBeenNthCalledWith(2, debugRequest);
  });

  it("shows image-pull errors after a bounded startup wait", async () => {
    get.mockResolvedValue(debugTestPod({ waiting: { reason: "ImagePullBackOff", message: "Image not found" } }));
    await state.start();
    expect(state.error).toContain("Startup timed out. Image not found");
    expect(get).toHaveBeenCalledTimes(120);
    expect(openShell).not.toHaveBeenCalled();
    expect(client.stop).not.toHaveBeenCalled();
  });

  it("explains early exits from an incompatible image", async () => {
    get.mockResolvedValue(
      debugTestPod({ terminated: { exitCode: 1, reason: "Error", startedAt: "then", finishedAt: "now" } }),
    );
    await state.start();
    expect(state.error).toContain("image needs sh, sleep, and a writable /tmp");
    expect(openShell).not.toHaveBeenCalled();
  });

  it("rejects a replacement pod before opening its shell", async () => {
    const replacement = debugTestPod({ running: { startedAt: "now" } }, { uid: "new-uid" });
    get.mockResolvedValue(replacement);
    await state.start();
    expect(state.error).toContain("deleted or replaced");
    expect(openShell).not.toHaveBeenCalled();
  });

  it("does not create with insufficient permissions", async () => {
    client.permissions.mockResolvedValue({ create: false, exec: true });
    await state.open(debugTestPod());
    await state.start();
    expect(state.disabledReason).toContain("permission");
    expect(client.create).not.toHaveBeenCalled();
  });
});
