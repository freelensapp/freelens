/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The main half of the fixture's unit level: it loads the built `dist/main.js`
// of `@freelensapp/fixture-extension` against the main process's API global and
// runs the host's kubectl through `Main.Shell`, the way an extension does. The
// kubectl is a script that prints the environment it got, so what is asserted
// is what a spawned process actually receives, through the bundle, the global
// and the host's DI container. It sends a request through a library the bundle
// gives `Main.Util.fetch` as its `fetch` option. It also evaluates the bundle
// in plain Node, the way Freelens loads it, which the module runner of Vitest
// does not reproduce.

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { computed } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../common/cluster/cluster";
import baseBundledBinariesDirectoryInjectable from "../../common/vars/base-bundled-binaries-dir.injectable";
import platformInjectable from "../../common/vars/platform.injectable";
import getClusterByIdInjectable from "../../features/cluster/storage/common/get-by-id.injectable";
import computeShellEnvironmentInjectable from "../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import proxyFetchInjectable from "../../main/fetch/proxy-fetch.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../main/kubectl/create-kubectl.injectable";
import { mainExtensionApiSingletons } from "../api-globals/main-singletons";
import * as Common from "../common-api";
import * as Main from "../main-api";

import type { Fetch } from "@freelensapp/json-api";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { KubeconfigManager } from "../../main/kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../../main/kubectl/kubectl";

interface FixtureMainBundle {
  probeHostFetch: () => Promise<number>;
  runHostKubectl: (clusterId?: string) => Promise<{ kubectlPath: string; stdout: string }>;
}

const fixtureMainBundlePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixture-extension/dist/main.js",
);

const assertFixtureMainBundleBuilt = () => {
  if (!existsSync(fixtureMainBundlePath)) {
    throw new Error(
      `The contract fixture is not built. Run \`pnpm --filter @freelensapp/fixture-extension build\` (or \`pnpm build\`) before this suite; expected ${fixtureMainBundlePath}`,
    );
  }
};

const importFixtureMainBundle = async (): Promise<FixtureMainBundle> => {
  assertFixtureMainBundleBuilt();

  return (await import(/* @vite-ignore */ pathToFileURL(fixtureMainBundlePath).href)) as FixtureMainBundle;
};

// Evaluates the bundle passed as the first argument in an ES module with
// stand-ins for the members of the API global its top level reaches, and
// prints its `endOfLine` export as JSON.
const evaluateInPlainNode = `
class Stub {}
globalThis.FreelensExtensionApi = { Common: {}, Main: { Ipc: Stub, LensExtension: Stub }, Renderer: {} };
const bundle = await import(process.argv[1]);
process.stdout.write(JSON.stringify(bundle.endOfLine));
`;

describe("the built fixture extension's main bundle", () => {
  // Vitest's module runner gives every module it loads a `require`, so the
  // suite below, which imports the bundle through it, would pass on either
  // Rolldown platform. Freelens loads `dist/main.js` as an ES module, which
  // has no `require`, so only a separate Node process shows what Freelens
  // sees.
  it("evaluates in plain Node, where its bundled CommonJS require()s a builtin", async () => {
    assertFixtureMainBundleBuilt();

    const { stdout } = await promisify(execFile)(process.execPath, [
      "--input-type=module",
      "--eval",
      evaluateInPlainNode,
      pathToFileURL(fixtureMainBundlePath).href,
    ]);

    expect(JSON.parse(stdout)).toBe(os.EOL);
  });
});

describe("Main.Util.fetch, from the built fixture extension", () => {
  let proxyFetch: Mock<Fetch>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    proxyFetch = vi.fn<Fetch>(async () => new Response(null, { status: 204 }));
    di.override(proxyFetchInjectable, () => proxyFetch);

    Object.assign(globalThis, { FreelensExtensionApi: { Common, Main, ...mainExtensionApiSingletons } });
  });

  afterEach(() => {
    Object.assign(globalThis, { FreelensExtensionApi: undefined });
  });

  // The bundle hands `Main.Util.fetch` to a library as its `fetch` option, and
  // the library sends a `Request` of its own making.
  it("sends the Request of a library given it as its fetch option through the host's client, whole", async () => {
    const fixture = await importFixtureMainBundle();

    await expect(fixture.probeHostFetch()).resolves.toBe(204);
    expect(proxyFetch).toHaveBeenCalledOnce();

    const [url, init] = proxyFetch.mock.calls[0];

    expect(url).toBe("https://fixture.invalid/contract-probe");
    expect(init).toMatchObject({ method: "POST", headers: [["content-type", "application/json"]] });
    expect(await new Response(init?.body as ReadableStream<Uint8Array>).text()).toBe('{"probe":true}');
  });
});

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
      () => () =>
        ({ getPath: async () => kubectlPath, getVersionMatchedPath: () => kubectlPath }) as Partial<Kubectl> as Kubectl,
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
    const state = di.inject(userPreferencesStateInjectable);

    state.downloadKubectlBinaries = false;
    state.kubectlBinariesPath = kubectlPath;

    const { kubectlPath: ran, stdout } = await fixture.runHostKubectl();

    expect(ran).toBe(kubectlPath);
    expect(ranWith(stdout)).toEqual({
      kubeconfig: "/home/some-user/.kube/config",
      // The bundled binaries directory as the fallback, and nothing derived
      // from the preference.
      path: `/usr/bin:/bin:${di.inject(baseBundledBinariesDirectoryInjectable)}`,
    });
  });
});
