/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The main half of the fixture's unit level: it loads the built `dist/main.js`
// of `@freelensapp/fixture-extension` against the main process's API global and
// runs the host's kubectl through `Main.Shell`, the way an extension does. The
// kubectl is a script that prints the environment it got, so what is asserted
// is what a spawned process actually receives, through the bundle, the global
// and the host's DI container.

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { computed } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../common/cluster/cluster";
import platformInjectable from "../../common/vars/platform.injectable";
import getClusterByIdInjectable from "../../features/cluster/storage/common/get-by-id.injectable";
import computeShellEnvironmentInjectable from "../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../main/kubectl/create-kubectl.injectable";
import { mainExtensionApiSingletons } from "../api-globals/main-singletons";
import * as Common from "../common-api";
import * as Main from "../main-api";

import type { DiContainer } from "@ogre-tools/injectable";

import type { KubeconfigManager } from "../../main/kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../../main/kubectl/kubectl";

interface FixtureMainBundle {
  runHostKubectl: (clusterId?: string) => Promise<{ kubectlPath: string; stdout: string }>;
}

const fixtureMainBundlePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixture-extension/dist/main.js",
);

const importFixtureMainBundle = async (): Promise<FixtureMainBundle> => {
  if (!existsSync(fixtureMainBundlePath)) {
    throw new Error(
      `The contract fixture is not built. Run \`pnpm --filter @freelensapp/fixture-extension build\` (or \`pnpm build\`) before this suite; expected ${fixtureMainBundlePath}`,
    );
  }

  return (await import(/* @vite-ignore */ pathToFileURL(fixtureMainBundlePath).href)) as FixtureMainBundle;
};

describe.skipIf(process.platform === "win32")("Main.Shell, from the built fixture extension", () => {
  let di: DiContainer;
  let directory: string;
  let kubectlPath: string;
  let cluster: Cluster;
  let fixture: FixtureMainBundle;

  const ranWith = (stdout: string) => JSON.parse(stdout) as { kubeconfig: string; path: string };

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "freelens-fixture-kubectl-"));
    kubectlPath = path.join(directory, "kubectl");
    // Prints the environment it was started with, as JSON.
    await fs.writeFile(
      kubectlPath,
      ["#!/bin/sh", `printf '{"kubeconfig":"%s","path":"%s"}' "$KUBECONFIG" "$PATH"`, ""].join("\n"),
      { mode: 0o755 },
    );

    di = getDiForUnitTesting();
    di.override(platformInjectable, () => "linux");
    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
    di.override(userShellSettingInjectable, () => computed(() => "/bin/sh"));
    di.override(computeShellEnvironmentInjectable, () => async () => ({
      callWasSuccessful: true as const,
      response: { PATH: "/usr/bin:/bin", KUBECONFIG: "/home/some-user/.kube/config" },
    }));

    cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some-kube-config-path",
    });
    cluster.accessible.set(true);
    di.override(getClusterByIdInjectable, () => (id) => (id === cluster.id ? cluster : undefined));
    di.override(
      createKubectlInjectable,
      () => () => ({ getPath: async () => kubectlPath }) as Partial<Kubectl> as Kubectl,
    );
    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePaths: vi.fn(async () => ({
            kubeconfigPath: "/some-directory-for-tmp/kubeconfig-some-cluster-id",
            cacheDirectoryPath: "/some-directory-for-tmp/kubecache-some-cluster-id",
          })),
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );
    di.inject(userPreferencesStateInjectable).downloadKubectlBinaries = true;

    Object.assign(globalThis, { FreelensExtensionApi: { Common, Main, ...mainExtensionApiSingletons } });

    fixture = await importFixtureMainBundle();
  });

  afterEach(async () => {
    Object.assign(globalThis, { FreelensExtensionApi: undefined });
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("runs the cluster's kubectl, reaching the cluster through Freelens", async () => {
    const { kubectlPath: ran, stdout } = await fixture.runHostKubectl(cluster.id);

    expect(ran).toBe(kubectlPath);
    expect(ranWith(stdout)).toEqual({
      kubeconfig: "/some-directory-for-tmp/kubeconfig-some-cluster-id",
      path: expect.stringMatching(new RegExp(`^${directory}:`)),
    });
  });

  it("runs the user's kubectl outside any cluster, with the user's own kubeconfig", async () => {
    di.inject(userPreferencesStateInjectable).kubectlBinariesPath = kubectlPath;

    const { kubectlPath: ran, stdout } = await fixture.runHostKubectl();

    expect(ran).toBe(kubectlPath);
    expect(ranWith(stdout)).toEqual({
      kubeconfig: "/home/some-user/.kube/config",
      path: expect.stringMatching(new RegExp(`^/usr/bin:/bin:${directory}(:|$)`)),
    });
  });
});
