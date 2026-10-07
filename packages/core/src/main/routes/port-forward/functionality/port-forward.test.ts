/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { spawn } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortForward } from "./port-forward";

import type { Logger } from "@freelensapp/logger";

vi.mock(import("node:child_process"), () => {
  const spawn = vi.fn();

  return { default: { spawn }, spawn } as unknown as typeof import("node:child_process");
});
vi.mock(import("tcp-port-used"), () => {
  const waitUntilUsedOnHost = vi.fn(async () => {});

  return { default: { waitUntilUsedOnHost }, waitUntilUsedOnHost } as unknown as typeof import("tcp-port-used");
});

describe("PortForward", () => {
  afterEach(() => {
    PortForward.portForwards.length = 0;
  });

  it("runs kubectl with the proxy kubeconfig and its cache directory", async () => {
    vi.mocked(spawn).mockReturnValue({
      on: vi.fn(),
      kill: vi.fn(),
      stdout: {},
      stderr: { on: vi.fn() },
    } as unknown as ReturnType<typeof spawn>);

    const portForward = new PortForward(
      {
        logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), silly: vi.fn(), warn: vi.fn() } as Logger,
        getKubectlBinPath: async () => "/some-kubectl",
        getPortFromStream: async () => 12345,
      },
      {
        kubeconfigPath: "/some-directory-for-temp/kubeconfig-some-cluster-id",
        cacheDirectoryPath: "/some-directory-for-temp/kubecache-some-cluster-id",
      },
      {
        clusterId: "some-cluster-id",
        kind: "pod",
        namespace: "some-namespace",
        name: "some-pod",
        port: 80,
        forwardPort: 0,
      },
    );

    expect(await portForward.start()).toBe(true);
    expect(spawn).toHaveBeenCalledWith(
      "/some-kubectl",
      [
        "--kubeconfig",
        "/some-directory-for-temp/kubeconfig-some-cluster-id",
        "--cache-dir",
        "/some-directory-for-temp/kubecache-some-cluster-id",
        "port-forward",
        "--address",
        "localhost",
        "-n",
        "some-namespace",
        "pod/some-pod",
        "0:80",
      ],
      {
        env: expect.objectContaining({
          KUBECACHEDIR: "/some-directory-for-temp/kubecache-some-cluster-id",
        }),
      },
    );
  });
});
