/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { debugSpec, debugTestPod } from "../test-utils";
import { DebugContainerActionsContent } from "./actions";

import type { ContainerState } from "@freelensapp/kube-object";

describe("debug container controls", () => {
  const attach = vi.fn();
  const stop = vi.fn();
  const confirm = vi.fn();
  const container = { name: debugSpec.container, image: debugSpec.image };

  beforeEach(() => vi.resetAllMocks());

  const renderControls = (state: ContainerState = { running: { startedAt: "now" } }) => {
    const pod = debugTestPod(state);

    render(
      <DebugContainerActionsContent pod={pod} container={container} attach={attach} stop={stop} confirm={confirm} />,
    );

    return pod;
  };

  it("attaches to a running container", () => {
    const pod = renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Attach" }));
    expect(attach).toHaveBeenCalledWith(pod, container);
  });

  it("stops only after confirmation and shows why it failed", async () => {
    stop.mockRejectedValue(new Error("sh: not found"));
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(stop).not.toHaveBeenCalled();
    await act(async () => confirm.mock.calls[0][0].ok());
    expect(stop).toHaveBeenCalledWith({ namespace: "default", pod: "app", container: debugSpec.container });
    expect(screen.getByRole("alert")).toHaveTextContent("sh: not found");
    expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled();
  });

  it("offers nothing for a container that does not run", () => {
    renderControls({ terminated: { exitCode: 0, reason: "Completed", startedAt: "then", finishedAt: "now" } });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
