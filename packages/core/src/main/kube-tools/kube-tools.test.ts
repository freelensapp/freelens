/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import { describe, expect, it } from "vitest";
import { composeKubeToolsEnvironment, directoriesForPath } from "./kube-tools";

import type { KubeTools } from "./kube-tools";

const tools = (overrides: Partial<KubeTools> = {}): KubeTools => ({
  kubectlPath: "/some-kubectl-directory/kubectl",
  helmPath: "/some-helm-directory/helm",
  pathPrefix: [],
  pathSuffix: [],
  ...overrides,
});

describe("directoriesForPath", () => {
  it("keeps the order, dropping repeated directories", () => {
    expect(
      directoriesForPath(
        path.posix.dirname,
        ["/bundled/kubectl", "/bundled/helm"],
        ["/user-data/binaries", "/bundled"],
      ),
    ).toEqual(["/bundled", "/user-data/binaries"]);
  });

  it("gives a bare binary name no directory, rather than the current one", () => {
    expect(directoriesForPath(path.posix.dirname, ["kubectl", "/bundled/helm"], [""])).toEqual(["/bundled"]);
  });
});

describe("composeKubeToolsEnvironment", () => {
  it("leaves no empty PATH entry when the user's environment has no PATH", () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: {},
      tools: tools({ pathPrefix: ["/some-kubectl-directory"] }),
      clusterAccess: { kubeconfigPath: "/proxy-kubeconfig", cacheDirectoryPath: "/proxy-cache" },
      isWindows: false,
    });

    expect(env.PATH).toBe("/some-kubectl-directory");
  });

  it("extends the PATH variable Windows spells Path, rather than adding a second one", () => {
    const env = composeKubeToolsEnvironment({
      baseEnvironment: { Path: "C:\\Windows" },
      tools: tools({ pathSuffix: ["C:\\Freelens\\resources"] }),
      isWindows: true,
    });

    expect(env).toMatchObject({ Path: "C:\\Windows;C:\\Freelens\\resources" });
    expect(env.PATH).toBeUndefined();
  });

  it("does not modify the environment it is given", () => {
    const baseEnvironment = { PATH: "/usr/bin", KUBECONFIG: "/home/some-user/.kube/config", DEBUG: "1" };

    composeKubeToolsEnvironment({
      baseEnvironment,
      tools: tools({ pathPrefix: ["/some-kubectl-directory"] }),
      clusterAccess: { kubeconfigPath: "/proxy-kubeconfig", cacheDirectoryPath: "/proxy-cache" },
      isWindows: false,
    });

    expect(baseEnvironment).toEqual({ PATH: "/usr/bin", KUBECONFIG: "/home/some-user/.kube/config", DEBUG: "1" });
  });
});
