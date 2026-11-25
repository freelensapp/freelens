/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { composeKubeToolsEnvironment } from "./kube-tools";

import type { KubeTools } from "./kube-tools";

const tools = (overrides: Partial<KubeTools> = {}): KubeTools => ({
  kubectlPath: "/some-kubectl-directory/kubectl",
  helmPath: "/some-helm-directory/helm",
  pathPrefix: [],
  pathSuffix: [],
  ...overrides,
});

describe("composeKubeToolsEnvironment", () => {
  it("leaves no empty PATH entry when the user's environment has no PATH", () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: {},
      tools: tools({ pathPrefix: ["/some-kubectl-directory"] }),
      clusterAccess: { kubeconfigPath: "/proxy-kubeconfig", cacheDirectoryPath: "/proxy-cache", token: "some-token" },
      isWindows: false,
    });

    expect(env.PATH).toBe("/some-kubectl-directory");
  });

  it("sets the proxy kubeconfig, its cache and the token for a cluster", () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: {},
      tools: tools(),
      clusterAccess: { kubeconfigPath: "/proxy-kubeconfig", cacheDirectoryPath: "/proxy-cache", token: "some-token" },
      isWindows: false,
    });

    expect(env.KUBECONFIG).toBe("/proxy-kubeconfig");
    expect(env.KUBECACHEDIR).toBe("/proxy-cache");
    expect(env.FREELENS_PROXY_TOKEN).toBe("some-token");
  });

  it("sets no token without a cluster", () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: {},
      tools: tools(),
      isWindows: false,
    });

    expect(env.FREELENS_PROXY_TOKEN).toBeUndefined();
  });

  it("extends the variable Windows spells Path under the one key PATH", () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: { Path: "C:\\Windows", SystemRoot: "C:\\Windows" },
      tools: tools({ pathSuffix: ["C:\\Freelens\\resources"] }),
      isWindows: true,
    });

    expect(env.PATH).toBe("C:\\Windows;C:\\Freelens\\resources");
    expect(Object.keys(env).filter((key) => key.toUpperCase() === "PATH")).toEqual(["PATH"]);
  });

  it("keeps the value of PATH itself when Windows' environment has more than one spelling", () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: { Path: "C:\\Other", PATH: "C:\\Windows" },
      tools: tools(),
      isWindows: true,
    });

    expect(Object.entries(env).filter(([key]) => key.toUpperCase() === "PATH")).toEqual([["PATH", "C:\\Windows"]]);
  });

  /**
   * On Windows, `process.env` itself is case-insensitive and its copy is not,
   * which is what the two tests above emulate. This one runs on the real
   * thing: Freelens' own environment, as the user's shell environment is on
   * Windows, passed to a child process.
   */
  it("gives a child process the PATH it composes, from this platform's own environment", async () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: process.env,
      tools: tools({ pathSuffix: [path.join(os.tmpdir(), "some-bundled-directory")] }),
      isWindows: process.platform === "win32",
    });

    expect(Object.keys(env).filter((key) => key.toUpperCase() === "PATH")).toEqual(["PATH"]);

    const { stdout } = await promisify(execFile)(process.execPath, ["-e", "process.stdout.write(process.env.PATH)"], {
      env: env as Record<string, string>,
    });

    expect(stdout).toBe(env.PATH);
    expect(stdout.split(path.delimiter).at(-1)).toBe(path.join(os.tmpdir(), "some-bundled-directory"));
  });

  it("does not modify the environment it is given", () => {
    const baseEnvironment = { PATH: "/usr/bin", KUBECONFIG: "/home/some-user/.kube/config", DEBUG: "1" };

    composeKubeToolsEnvironment({
      baseEnvironment,
      tools: tools({ pathPrefix: ["/some-kubectl-directory"] }),
      clusterAccess: { kubeconfigPath: "/proxy-kubeconfig", cacheDirectoryPath: "/proxy-cache", token: "some-token" },
      isWindows: false,
    });

    expect(baseEnvironment).toEqual({ PATH: "/usr/bin", KUBECONFIG: "/home/some-user/.kube/config", DEBUG: "1" });
  });
});
