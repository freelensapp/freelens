/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { disposer } from "@freelensapp/utilities";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import portForwardStoreInjectable from "../../../port-forward/port-forward-store/port-forward-store.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { PodDetailsContainer } from "../pod-details-container";

import type { PodContainerStatus, PodStatus } from "@freelensapp/kube-object";

vi.mock("../pod-container-env", () => ({
  ContainerEnvironment: () => null,
}));

describe("pod-details-container", () => {
  it("renders container resize policy", () => {
    const di = getDiForUnitTesting();

    di.override(portForwardStoreInjectable, () => ({
      watch: () => disposer(),
    }));

    const render = renderFor(di);
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "test-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/namespaces/default/pods/test-pod",
        uid: "pod-uid",
      },
      spec: {
        containers: [
          {
            name: "main",
            resizePolicy: [
              {
                resourceName: "cpu",
                restartPolicy: "NotRequired",
              },
              {
                resourceName: "memory",
                restartPolicy: "RestartContainer",
              },
            ],
          },
        ],
      },
      status: {} as PodStatus,
    });

    render(<PodDetailsContainer pod={pod} container={pod.getContainersWithType()[0]} />);

    expect(screen.getByText("Resize Policy")).toBeInTheDocument();
    expect(screen.getByText("cpu=NotRequired")).toBeInTheDocument();
    expect(screen.getByText("memory=RestartContainer")).toBeInTheDocument();
  });

  describe("default container marker", () => {
    const renderContainer = (containerName: string) => {
      const di = getDiForUnitTesting();

      di.override(portForwardStoreInjectable, () => ({
        watch: () => disposer(),
      }));

      const render = renderFor(di);
      const pod = new Pod({
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          name: "test-pod",
          namespace: "default",
          resourceVersion: "1",
          selfLink: "/api/v1/namespaces/default/pods/test-pod",
          uid: "pod-uid",
          annotations: {
            "kubectl.kubernetes.io/default-container": "sidecar",
          },
        },
        spec: {
          containers: [{ name: "main" }, { name: "sidecar" }],
        },
        status: {} as PodStatus,
      });
      const container = pod.getContainersWithType().find(({ name }) => name === containerName);

      return render(<PodDetailsContainer pod={pod} container={container!} />);
    };

    it("marks the container named by the annotation", () => {
      const { container } = renderContainer("sidecar");

      expect(container.querySelector(".pod-container-title")).toHaveTextContent("sidecar (default)");
    });

    it("does not mark another container", () => {
      const { container } = renderContainer("main");

      expect(container.querySelector(".pod-container-title")).toHaveTextContent(/^main$/);
    });
  });

  describe("container status", () => {
    const renderWithStatus = (containerStatus: Partial<PodContainerStatus>) => {
      const di = getDiForUnitTesting();

      di.override(portForwardStoreInjectable, () => ({
        watch: () => disposer(),
      }));

      const render = renderFor(di);
      const pod = new Pod({
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          name: "test-pod",
          namespace: "default",
          resourceVersion: "1",
          selfLink: "/api/v1/namespaces/default/pods/test-pod",
          uid: "pod-uid",
        },
        spec: { containers: [{ name: "main", image: "app:1" }] },
        status: {
          containerStatuses: [
            { name: "main", image: "app:1", imageID: "", ready: false, restartCount: 0, ...containerStatus },
          ],
        } as PodStatus,
      });

      render(<PodDetailsContainer pod={pod} container={pod.getContainersWithType()[0]} />);
    };

    it("shows why a container waits, with its message and restart count", () => {
      renderWithStatus({
        restartCount: 7,
        state: { waiting: { reason: "CrashLoopBackOff", message: "back-off 5m0s restarting failed container" } },
      });

      expect(screen.getByText("waiting, restarted - CrashLoopBackOff")).toBeInTheDocument();
      expect(screen.getByText("back-off 5m0s restarting failed container")).toBeInTheDocument();
      expect(screen.getByText("Restarts")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("shows the exit code, signal and message of the last termination", () => {
      renderWithStatus({
        restartCount: 1,
        state: { running: { startedAt: "2026-11-27T10:00:00Z" } },
        lastState: {
          terminated: {
            reason: "Error",
            exitCode: 143,
            signal: 15,
            message: "shutting down",
            startedAt: "2026-11-27T09:00:00Z",
            finishedAt: "2026-11-27T09:59:00Z",
          },
        },
      });

      expect(screen.getByText(/Reason: Error \(exit code: 143, signal: 15\)/)).toBeInTheDocument();
      expect(screen.getByText("shutting down")).toBeInTheDocument();
    });
  });
});
