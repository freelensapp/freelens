/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JsonApiErrorParsed } from "@freelensapp/json-api";
import { buildDebugContainer } from "../common/debug-container";
import { debugRequest, debugTestPod } from "../test-utils";
import { DebugContainers } from "./debug-containers";

describe("debug container lifecycle", () => {
  const get = vi.fn();
  const addEphemeralContainer = vi.fn();
  const getNode = vi.fn();
  const canI = vi.fn();
  const execInPod = vi.fn();
  const service = new DebugContainers({
    podApi: { get, addEphemeralContainer },
    nodeApi: { get: getNode },
    canI,
    execInPod,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    get.mockResolvedValue(debugTestPod());
    canI.mockResolvedValue(true);
  });

  it("adds an unprivileged persistent debugger with optimistic pod identity", async () => {
    await service.create(debugRequest);
    expect(addEphemeralContainer).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "pod-uid", resourceVersion: "1" }),
      expect.objectContaining({
        targetContainerName: "app",
        securityContext: { privileged: false, allowPrivilegeEscalation: false },
      }),
    );
    expect(getNode).not.toHaveBeenCalled();
    expect(execInPod).not.toHaveBeenCalled();
  });

  it("checks namespace-scoped subresource permissions", async () => {
    canI.mockResolvedValue(false);
    await expect(service.create(debugRequest)).rejects.toThrow("patch permission");
    expect(canI).toHaveBeenCalledWith({
      namespace: "default",
      group: "",
      resource: "pods",
      subresource: "ephemeralcontainers",
      verb: "patch",
    });
    expect(canI).toHaveBeenCalledWith({
      namespace: "default",
      group: "",
      resource: "pods",
      subresource: "exec",
      verb: "create",
    });
    expect(addEphemeralContainer).not.toHaveBeenCalled();
  });

  it("rereads after a conflict and preserves a concurrently added debugger", async () => {
    const updated = debugTestPod(undefined, { resourceVersion: "2" });
    updated.spec.ephemeralContainers = [{ name: "another-debugger", image: "busybox" }];
    get.mockResolvedValueOnce(debugTestPod()).mockResolvedValue(updated);
    addEphemeralContainer
      .mockRejectedValueOnce(new JsonApiErrorParsed({ code: 409 }, ["Conflict"]))
      .mockResolvedValue(updated);
    await service.create(debugRequest);
    expect(addEphemeralContainer).toHaveBeenLastCalledWith(
      expect.objectContaining({ resourceVersion: "2" }),
      buildDebugContainer(debugRequest),
    );
    expect(updated.spec.ephemeralContainers).toEqual([{ name: "another-debugger", image: "busybox" }]);
  });

  it("bounds conflict retries", async () => {
    addEphemeralContainer.mockRejectedValue({ code: 409 });
    await expect(service.create(debugRequest)).rejects.toEqual({ code: 409 });
    expect(addEphemeralContainer).toHaveBeenCalledTimes(3);
  });

  it.each([403, 422, 500])("surfaces API failure %s without retrying", async (code) => {
    addEphemeralContainer.mockRejectedValue({ code, message: "admission denied" });
    await expect(service.create(debugRequest)).rejects.toMatchObject({ code });
    expect(addEphemeralContainer).toHaveBeenCalledTimes(1);
  });

  it("does not add a second debugger after an uncertain successful request", async () => {
    const pod = debugTestPod();
    pod.spec.ephemeralContainers = [buildDebugContainer(debugRequest)];
    get.mockResolvedValue(pod);
    await service.create(debugRequest);
    expect(addEphemeralContainer).not.toHaveBeenCalled();
  });

  it("rejects a conflicting container rather than taking ownership", async () => {
    const pod = debugTestPod();
    pod.spec.ephemeralContainers = [{ ...buildDebugContainer(debugRequest), image: "different" }];
    get.mockResolvedValue(pod);
    await expect(service.create(debugRequest)).rejects.toThrow("name is already in use");
    expect(addEphemeralContainer).not.toHaveBeenCalled();
  });

  it.each(["create", "stop", "getManagedContainer"] as const)("rejects a replacement pod during %s", async (action) => {
    const pod = debugTestPod(undefined, { uid: "replacement" });
    get.mockResolvedValue(pod);
    await expect(service[action](debugRequest)).rejects.toThrow("deleted or replaced");
    expect(addEphemeralContainer).not.toHaveBeenCalled();
    expect(execInPod).not.toHaveBeenCalled();
  });

  it.each(["windows", "unscheduled", "completed", "static", "target-missing"])(
    "rejects an unsupported %s pod",
    async (variant) => {
      const pod = debugTestPod();
      if (variant === "windows") pod.spec.os = { name: "windows" };
      if (variant === "unscheduled") delete pod.spec.nodeName;
      if (variant === "completed" && pod.status) pod.status.phase = "Succeeded";
      if (variant === "static") pod.metadata.annotations = { "kubernetes.io/config.mirror": "hash" };
      if (variant === "target-missing") pod.spec.containers = [];
      get.mockResolvedValue(pod);
      await expect(service.create(debugRequest)).rejects.toThrow();
      expect(addEphemeralContainer).not.toHaveBeenCalled();
    },
  );

  it("checks the node when older pods do not declare their OS", async () => {
    const pod = debugTestPod();
    delete pod.spec.os;
    get.mockResolvedValue(pod);
    getNode.mockResolvedValue({ getOperatingSystem: () => "windows" });
    await expect(service.create(debugRequest)).rejects.toThrow("Linux");
    expect(getNode).toHaveBeenCalledWith({ name: "node" });
  });

  it("recognizes a debugger from its persisted spec after restart", async () => {
    const pod = debugTestPod({ running: { startedAt: "now" } });
    pod.spec.ephemeralContainers = [buildDebugContainer(debugRequest)];
    get.mockResolvedValue(pod);
    await expect(service.getManagedContainer(debugRequest)).resolves.toMatchObject({
      status: { state: { running: {} } },
    });
  });

  it("stops only its own keepalive, including when process namespaces are shared", async () => {
    const pod = debugTestPod({ running: { startedAt: "now" } });
    pod.spec.shareProcessNamespace = true;
    pod.spec.ephemeralContainers = [buildDebugContainer(debugRequest)];
    get.mockResolvedValue(pod);
    await service.stop(debugRequest);
    expect(execInPod).toHaveBeenCalledWith(debugRequest, [
      "sh",
      "-c",
      ': > "$1"',
      "--",
      "/tmp/freelens-debug-123.stop",
    ]);
    expect(addEphemeralContainer).not.toHaveBeenCalled();
  });

  it("does not stop an unrelated ephemeral container", async () => {
    const pod = debugTestPod({ running: { startedAt: "now" } });
    pod.spec.ephemeralContainers = [{ name: debugRequest.containerName, image: "alpine" }];
    get.mockResolvedValue(pod);
    await expect(service.stop(debugRequest)).rejects.toThrow("supported debug lifecycle");
    expect(execInPod).not.toHaveBeenCalled();
  });

  it("treats an already terminated debugger as stopped", async () => {
    const pod = debugTestPod({
      terminated: { exitCode: 0, reason: "Completed", startedAt: "then", finishedAt: "now" },
    });
    pod.spec.ephemeralContainers = [buildDebugContainer(debugRequest)];
    get.mockResolvedValue(pod);
    await service.stop(debugRequest);
    expect(execInPod).not.toHaveBeenCalled();
  });

  it("surfaces stop failures so the user can retry", async () => {
    const pod = debugTestPod({ running: { startedAt: "now" } });
    pod.spec.ephemeralContainers = [buildDebugContainer(debugRequest)];
    get.mockResolvedValue(pod);
    execInPod.mockRejectedValue(new Error("read-only file system"));
    await expect(service.stop(debugRequest)).rejects.toThrow("read-only file system");
  });
});
