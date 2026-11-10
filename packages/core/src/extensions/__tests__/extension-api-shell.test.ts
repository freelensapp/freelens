/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../common/cluster/cluster";
import baseBundledBinariesDirectoryInjectable from "../../common/vars/base-bundled-binaries-dir.injectable";
import platformInjectable from "../../common/vars/platform.injectable";
import getClusterByIdInjectable from "../../features/cluster/storage/common/get-by-id.injectable";
import computeShellEnvironmentInjectable from "../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../main/kubectl/create-kubectl.injectable";
import modifyTerminalShellEnvInjectable from "../../main/shell-session/shell-env-modifier/modify-terminal-shell-env.injectable";
import { Main } from "../extension-api";

import type { DiContainer } from "@ogre-tools/injectable";
import type { MockedFunction } from "vitest";

import type { KubeconfigManager } from "../../main/kubeconfig-manager/kubeconfig-manager";
import type { Kubectl, KubectlProgressOptions } from "../../main/kubectl/kubectl";

describe("Main.Shell", () => {
  let di: DiContainer;
  let cluster: Cluster;
  let kubectlPath: string;
  let bundleUsable: boolean;
  let createKubectl: MockedFunction<(version: string) => Kubectl>;
  let ensurePaths: MockedFunction<KubeconfigManager["ensurePaths"]>;
  let modifyTerminalShellEnv: MockedFunction<() => never>;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(platformInjectable, () => "linux");
    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
    di.override(baseBundledBinariesDirectoryInjectable, () => "/some-bundled-binaries-directory");
    di.override(userShellSettingInjectable, () => computed(() => "/bin/bash"));
    di.override(computeShellEnvironmentInjectable, () => async () => ({
      callWasSuccessful: true as const,
      response: {
        PATH: "/home/some-user/bin:/usr/bin",
        KUBECONFIG: "/home/some-user/.kube/config",
        kubeconfig: "/home/some-user/.kube/other-config",
        HOME: "/home/some-user",
        DEBUG: "1",
      },
    }));

    cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some-kube-config-path",
    });
    cluster.accessible.set(true);
    cluster.metadata.version = "v1.33.4";
    cluster.preferences.httpsProxy = "http://some-proxy:3128";
    di.override(getClusterByIdInjectable, () => (id) => (id === cluster.id ? cluster : undefined));

    kubectlPath = "/some-directory-for-user-data/binaries/kubectl/1.33.4/kubectl";
    bundleUsable = true;
    createKubectl = vi.fn(
      () =>
        ({
          // What `Kubectl.getPath` does, as far as its callers can tell.
          getPath: async (options?: KubectlProgressOptions, { whenBundleUnusable = "use-path" } = {}) => {
            if (!bundleUsable) {
              const problem = "The bundled kubectl v1.34.1 is not usable, so kubectl v1.33.4 was not prepared";

              if (whenBundleUnusable === "reject") {
                throw new Error(`${problem} and Freelens has no kubectl of its own to run`);
              }

              options?.onProblem?.(`${problem} - using whichever kubectl is on PATH`);

              return "kubectl";
            }

            options?.onPhase?.("Downloading kubectl v1.33.4 ...");
            options?.onDownloadProgress?.({ transferred: 10, total: 10 });
            options?.onPhase?.("Verifying kubectl v1.33.4 ...");

            return kubectlPath;
          },
          getVersionMatchedPath: () => "/some-directory-for-user-data/binaries/kubectl/1.33.4/kubectl",
        }) as Partial<Kubectl> as Kubectl,
    );
    di.override(createKubectlInjectable, () => createKubectl);

    ensurePaths = vi.fn(async () => ({
      kubeconfigPath: "/some-directory-for-tmp/kubeconfig-some-cluster-id",
      cacheDirectoryPath: "/some-directory-for-tmp/kubecache-some-cluster-id",
    }));
    di.override(
      kubeconfigManagerInjectable,
      () => ({ ensurePaths }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

    modifyTerminalShellEnv = vi.fn(() => {
      throw new Error("an extension's environment went through the terminal's modifiers");
    });
    di.override(modifyTerminalShellEnvInjectable, () => modifyTerminalShellEnv);

    di.inject(userPreferencesStateInjectable).downloadKubectlBinaries = true;
  });

  describe("without a cluster", () => {
    it("returns the bundled kubectl and helm", async () => {
      expect(await Main.Shell.getKubectlPath()).toBe("/some-bundled-binaries-directory/kubectl");
      expect(await Main.Shell.getHelmPath()).toBe("/some-bundled-binaries-directory/helm");
    });

    it("returns the user's kubectl and helm when the preferences apply", async () => {
      const state = di.inject(userPreferencesStateInjectable);

      state.downloadKubectlBinaries = false;
      state.kubectlBinariesPath = "/opt/kubectl/bin/kubectl";
      state.helmBinariesPath = "/opt/homebrew/bin/helm";

      expect(await Main.Shell.getKubectlPath()).toBe("/opt/kubectl/bin/kubectl");
      expect(await Main.Shell.getHelmPath()).toBe("/opt/homebrew/bin/helm");
    });

    it("ignores the kubectl preference while downloading kubectl is turned on, as Freelens does", async () => {
      di.inject(userPreferencesStateInjectable).kubectlBinariesPath = "/opt/kubectl/bin/kubectl";

      expect(await Main.Shell.getKubectlPath()).toBe("/some-bundled-binaries-directory/kubectl");
    });

    it("appends only the bundled binaries directory to the user's PATH and keeps the user's KUBECONFIG", async () => {
      const state = di.inject(userPreferencesStateInjectable);

      state.downloadKubectlBinaries = false;
      state.kubectlBinariesPath = "/opt/kubectl/bin/kubectl";
      state.helmBinariesPath = "/opt/homebrew/bin/helm";

      const env = await Main.Shell.getEnvironment();

      expect(env.PATH.split(":")).toEqual(["/home/some-user/bin", "/usr/bin", "/some-bundled-binaries-directory"]);
      expect(env.KUBECONFIG).toBe("/home/some-user/.kube/config");
      expect(env.KUBECACHEDIR).toBeUndefined();
      expect(env.DEBUG).toBeUndefined();
    });

    it("exports the application's proxy preference as HTTPS_PROXY, as the terminal does", async () => {
      di.inject(userPreferencesStateInjectable).httpsProxy = "socks5://some-application-proxy:1080";

      expect((await Main.Shell.getEnvironment()).HTTPS_PROXY).toBe("socks5://some-application-proxy:1080");
    });

    it("never constructs a kubectl nor starts a cluster proxy", async () => {
      await Main.Shell.getKubectlPath();
      await Main.Shell.getEnvironment();

      expect(createKubectl).not.toHaveBeenCalled();
      expect(ensurePaths).not.toHaveBeenCalled();
    });
  });

  describe("for a cluster", () => {
    it("returns the kubectl matched to the cluster's version", async () => {
      expect(await Main.Shell.getKubectlPath(cluster.id)).toBe(kubectlPath);
      expect(createKubectl).toHaveBeenCalledWith("v1.33.4");
    });

    it("reports the download through the callbacks", async () => {
      const events: string[] = [];

      await Main.Shell.getKubectlPath(cluster.id, {
        onDownloadProgress: ({ transferred, total }) => events.push(`progress: ${transferred}/${total}`),
        onPhase: (message) => events.push(`phase: ${message}`),
      });

      expect(events).toEqual([
        "phase: Downloading kubectl v1.33.4 ...",
        "progress: 10/10",
        "phase: Verifying kubectl v1.33.4 ...",
      ]);
    });

    it("returns the same helm as without a cluster", async () => {
      di.inject(userPreferencesStateInjectable).helmBinariesPath = "/opt/homebrew/bin/helm";

      expect(await Main.Shell.getHelmPath(cluster.id)).toBe("/opt/homebrew/bin/helm");
    });

    it("puts the version-matched kubectl first on PATH and the bundled binaries directory last", async () => {
      di.inject(userPreferencesStateInjectable).helmBinariesPath = "/opt/homebrew/bin/helm";

      const env = await Main.Shell.getEnvironment(cluster.id);

      expect(env.PATH.split(":")).toEqual([
        "/some-directory-for-user-data/binaries/kubectl/1.33.4",
        "/home/some-user/bin",
        "/usr/bin",
        "/some-bundled-binaries-directory",
      ]);
    });

    it("puts no kubectl directory first on PATH when the version-matched kubectl is not the one it runs", async () => {
      const state = di.inject(userPreferencesStateInjectable);

      state.downloadKubectlBinaries = false;
      state.kubectlBinariesPath = "/opt/kubectl/bin/kubectl";
      kubectlPath = "/opt/kubectl/bin/kubectl";

      expect(await Main.Shell.getKubectlPath(cluster.id)).toBe("/opt/kubectl/bin/kubectl");
      expect((await Main.Shell.getEnvironment(cluster.id)).PATH.split(":")).toEqual([
        "/home/some-user/bin",
        "/usr/bin",
        "/some-bundled-binaries-directory",
      ]);
    });

    it("reaches the cluster through Freelens, replacing every kubeconfig variable of the user's", async () => {
      di.inject(userPreferencesStateInjectable).httpsProxy = "socks5://some-application-proxy:1080";

      const env = await Main.Shell.getEnvironment(cluster.id);

      expect(env).toMatchObject({
        KUBECONFIG: "/some-directory-for-tmp/kubeconfig-some-cluster-id",
        KUBECACHEDIR: "/some-directory-for-tmp/kubecache-some-cluster-id",
        HTTPS_PROXY: "http://some-proxy:3128",
        NO_PROXY: "localhost,127.0.0.1",
      });
      expect(env.kubeconfig).toBeUndefined();
    });

    it("has no terminal-only variables and no extension's modifications", async () => {
      const env = await Main.Shell.getEnvironment(cluster.id);

      expect(env.PTYSHELL).toBeUndefined();
      expect(env.ZDOTDIR).toBeUndefined();
      expect(env.TERM_PROGRAM).toBeUndefined();
      expect(modifyTerminalShellEnv).not.toHaveBeenCalled();
    });

    it("rejects getKubectlPath when the bundled kubectl is not usable, rather than reporting it goes on", async () => {
      const onProblem = vi.fn();

      bundleUsable = false;

      await expect(Main.Shell.getKubectlPath(cluster.id, { onProblem })).rejects.toThrow(
        "Freelens has no kubectl of its own to run",
      );
      expect(onProblem).not.toHaveBeenCalled();
    });

    it("leaves kubectl to the user's PATH in getEnvironment when the bundled kubectl is not usable, and says so", async () => {
      const problems: string[] = [];

      bundleUsable = false;

      const env = await Main.Shell.getEnvironment(cluster.id, { onProblem: (p) => problems.push(p) });

      expect(problems).toEqual([expect.stringContaining("using whichever kubectl is on PATH")]);
      expect(env.PATH.split(":")).toEqual(["/home/some-user/bin", "/usr/bin", "/some-bundled-binaries-directory"]);
    });

    it.each([
      ["getKubectlPath", () => Main.Shell.getKubectlPath(cluster.id)],
      ["getHelmPath", () => Main.Shell.getHelmPath(cluster.id)],
      ["getEnvironment", () => Main.Shell.getEnvironment(cluster.id)],
    ])("%s rejects a cluster that is not connected, without starting its proxy", async (_name, call) => {
      cluster.accessible.set(false);

      await expect(call()).rejects.toThrow("is not connected");
      expect(ensurePaths).not.toHaveBeenCalled();
      expect(createKubectl).not.toHaveBeenCalled();
    });

    it("rejects an unknown cluster", async () => {
      await expect(Main.Shell.getEnvironment("some-other-cluster-id")).rejects.toThrow(
        'There is no cluster with the id "some-other-cluster-id"',
      );
    });
  });
});
