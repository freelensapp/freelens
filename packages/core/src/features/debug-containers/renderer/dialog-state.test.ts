/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { debugSpec, debugTestPod } from "../test-utils";
import { DebugContainerDialogState } from "./dialog-state";

describe("debug container dialog", () => {
  const openTerminal = vi.fn();
  let state: DebugContainerDialogState;

  beforeEach(() => {
    vi.resetAllMocks();
    state = new DebugContainerDialogState({
      getDefaultImage: () => "alpine:latest",
      randomId: () => "123",
      openTerminal,
    });
    state.open(debugTestPod());
  });

  it("opens a terminal for the container the dialog describes", () => {
    state.set("profile", "netadmin");
    state.set("env", "A: 1\nB: x=y z\nC:\n");
    state.set("custom", "securityContext:\n  runAsUser: 0\n");
    state.start();
    expect(openTerminal).toHaveBeenCalledWith({
      ...debugSpec,
      profile: "netadmin",
      env: ["A=1", "B=x=y z", "C="],
      custom: "securityContext:\n  runAsUser: 0\n",
    });
    expect(state.pod).toBeUndefined();
  });

  it("suggests the general profile, and leaves it to kubectl when the user clears it", () => {
    expect(state.profile).toBe("general");
    state.set("profile", "");
    state.start();
    expect(openTerminal).toHaveBeenCalledWith({ ...debugSpec, profile: undefined, custom: undefined });
  });

  it("attaches to a running ephemeral container without the dialog", () => {
    const pod = debugTestPod({ running: { startedAt: "now" } });

    state.close();
    state.attach(pod, { name: "manual-debugger", image: "busybox", targetContainerName: "app" });
    expect(openTerminal).toHaveBeenCalledWith({
      namespace: "default",
      pod: "app",
      podUid: "pod-uid",
      container: "manual-debugger",
      image: "busybox",
      target: "app",
    });
  });

  it("targets the default container of the pod", () => {
    const pod = debugTestPod(undefined, { annotations: { "kubectl.kubernetes.io/default-container": "sidecar" } });

    pod.spec.containers = [
      { name: "app", image: "app" },
      { name: "sidecar", image: "sidecar" },
    ];
    state.open(pod);
    expect(state.target).toBe("sidecar");
  });

  it.each([
    ["image", "", "Enter an image reference without spaces."],
    ["image", "alpine latest", "Enter an image reference without spaces."],
    ["image", "--help", "Enter an image reference without spaces."],
    ["target", "", "Select a target container."],
    ["env", "- A=1", "The environment must be a mapping."],
    ["env", "A: [", expect.stringContaining("The environment is not valid YAML")],
    ["custom", "sleep", "The custom container spec must be a mapping."],
  ] as const)("does not start with an invalid %s %j", (field, value, error) => {
    state.set(field, value);
    expect(state.error).toEqual(error);
    state.start();
    expect(openTerminal).not.toHaveBeenCalled();
  });

  it.each([
    ["a terminating pod", debugTestPod(undefined, { deletionTimestamp: "now" })],
    ["a static pod", debugTestPod(undefined, { annotations: { "kubernetes.io/config.mirror": "mirror" } })],
  ])("does not start for %s", (_, pod) => {
    state.open(pod);
    expect(state.error).toBeTruthy();
    state.start();
    expect(openTerminal).not.toHaveBeenCalled();
  });

  it("does not start for a Windows pod", () => {
    const pod = debugTestPod();

    pod.spec.os = { name: "windows" };
    state.open(pod);
    expect(state.error).toBe("Debug containers currently support Linux pods only.");
  });

  it("names a new container each time it opens", () => {
    let id = 0;

    state = new DebugContainerDialogState({
      getDefaultImage: () => "alpine",
      randomId: () => `${++id}`,
      openTerminal,
    });
    state.open(debugTestPod());
    const first = state.container;

    state.open(debugTestPod());
    expect(state.container).not.toBe(first);
  });
});
