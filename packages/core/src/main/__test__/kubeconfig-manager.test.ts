/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import asyncFn from "@async-fn/vitest";
import { loggerInjectionToken } from "@freelensapp/logger";
import yaml from "js-yaml";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../common/cluster/cluster";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../common/fs/path-exists-sync.injectable";
import readFileInjectable from "../../common/fs/read-file.injectable";
import readJsonSyncInjectable from "../../common/fs/read-json-sync.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import writeFileInjectable from "../../common/fs/write-file.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import normalizedPlatformInjectable from "../../common/vars/normalized-platform.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import kubeAuthProxyServerInjectable from "../cluster/kube-auth-proxy-server.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import kubectlBinaryNameInjectable from "../kubectl/binary-name.injectable";
import kubectlDownloadingNormalizedArchInjectable from "../kubectl/normalized-arch.injectable";
import lensProxyPortInjectable from "../lens-proxy/lens-proxy-port.injectable";

import type { Logger } from "@freelensapp/logger";

import type { AsyncFnMock } from "@async-fn/vitest";
import type { DiContainer } from "@ogre-tools/injectable";
import type { Mocked } from "vitest";

import type { PathExists } from "../../common/fs/path-exists.injectable";
import type { ReadFile } from "../../common/fs/read-file.injectable";
import type { RemovePath } from "../../common/fs/remove.injectable";
import type { WriteFile } from "../../common/fs/write-file.injectable";
import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";

const clusterServerUrl = "https://192.168.64.3:8443";

describe("kubeconfig manager tests", () => {
  let clusterFake: Cluster;
  let di: DiContainer;
  let loggerMock: Mocked<Logger>;
  let readFileMock: AsyncFnMock<ReadFile>;
  let deleteFileMock: AsyncFnMock<RemovePath>;
  let writeFileMock: AsyncFnMock<WriteFile>;
  let pathExistsMock: AsyncFnMock<PathExists>;
  let kubeConfManager: KubeconfigManager;
  let ensureServerMock: AsyncFnMock<() => Promise<void>>;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    di.override(directoryForTempInjectable, () => "/some-directory-for-temp");
    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(kubectlBinaryNameInjectable, () => "kubectl");
    di.override(kubectlDownloadingNormalizedArchInjectable, () => "amd64");
    di.override(normalizedPlatformInjectable, () => "darwin");
    di.override(pathExistsSyncInjectable, () => () => {
      throw new Error("tried call pathExistsSync without override");
    });
    di.override(readJsonSyncInjectable, () => () => {
      throw new Error("tried call readJsonSync without override");
    });
    di.override(writeJsonSyncInjectable, () => () => {
      throw new Error("tried call writeJsonSync without override");
    });
    di.inject(lensProxyPortInjectable).set(9191);

    readFileMock = asyncFn();
    di.override(readFileInjectable, () => readFileMock);
    writeFileMock = asyncFn();
    di.override(writeFileInjectable, () => writeFileMock);
    pathExistsMock = asyncFn();
    di.override(pathExistsInjectable, () => pathExistsMock);
    deleteFileMock = asyncFn();
    di.override(removePathInjectable, () => deleteFileMock);

    loggerMock = {
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
    };

    di.override(loggerInjectionToken, () => loggerMock);

    ensureServerMock = asyncFn();

    di.override(kubeAuthProxyServerInjectable, () => ({
      restart: vi.fn(),
      stop: vi.fn(),
      getApiTarget: vi.fn(),
      ensureRunning: ensureServerMock,
      ensureAuthProxyUrl: vi.fn(),
    }));

    clusterFake = new Cluster({
      id: "foo",
      contextName: "kind-kind",
      kubeConfigPath: "/kind-config.yml",
    });

    kubeConfManager = di.inject(kubeconfigManagerInjectable, clusterFake);
  });

  describe("when calling clear", () => {
    it("should resolve immediately", async () => {
      await kubeConfManager.clear();
    });

    it("being called several times shouldn't throw", async () => {
      await kubeConfManager.clear();
      await kubeConfManager.clear();
      await kubeConfManager.clear();
    });
  });

  describe("when getPath() is called initially", () => {
    let getPathPromise: Promise<string>;

    beforeEach(async () => {
      getPathPromise = kubeConfManager.ensurePath();
    });

    it("should not call pathExists()", () => {
      expect(pathExistsMock).not.toBeCalled();
    });

    it("should call ensureServer on the cluster context", () => {
      expect(ensureServerMock).toBeCalledTimes(1);
    });

    describe("when ensureServer resolves", () => {
      beforeEach(async () => {
        await ensureServerMock.resolve();

        // clear state of calls
        ensureServerMock.mock.calls.length = 0;
      });

      describe("when reading cluster's kubeconfig resolves", () => {
        beforeEach(async () => {
          await readFileMock.resolveSpecific(
            ["/kind-config.yml"],
            JSON.stringify({
              apiVersion: "v1",
              clusters: [
                {
                  name: "kind-kind",
                  cluster: {
                    server: clusterServerUrl,
                  },
                },
              ],
              contexts: [
                {
                  context: {
                    cluster: "kind-kind",
                    user: "kind-kind",
                  },
                  name: "kind-kind",
                },
              ],
              users: [
                {
                  name: "kind-kind",
                },
              ],
              kind: "Config",
              preferences: {},
            }),
          );
        });

        describe("when writing out new proxy kubeconfig resolves", () => {
          beforeEach(async () => {
            await writeFileMock.resolveSpecific([
              "/some-directory-for-temp/kubeconfig-foo",
              "apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: PGNhLWRhdGE+\n    insecure-skip-tls-verify: false\n    server: https://127.0.0.1:9191/foo\n  name: kind-kind\ncontexts:\n- context:\n    cluster: kind-kind\n    user: proxy\n  name: kind-kind\ncurrent-context: kind-kind\nkind: Config\npreferences: {}\nusers:\n- name: proxy\n  user:\n    password: fake\n    username: lens\n",
            ]);
          });

          it("should allow getPath to resolve with the path to the kubeconfig", async () => {
            expect(await getPathPromise).toBe("/some-directory-for-temp/kubeconfig-foo");
          });

          describe("when calling clear", () => {
            let clearPromise: Promise<void>;

            beforeEach(() => {
              clearPromise = kubeConfManager.clear();
            });

            it("should call deleteFile", () => {
              expect(deleteFileMock).toBeCalledTimes(1);
            });

            describe("when deleteFile resolves", () => {
              beforeEach(async () => {
                await deleteFileMock.resolveSpecific(["/some-directory-for-temp/kubeconfig-foo"]);
              });

              it("should allow clear to resolve", async () => {
                await clearPromise;
              });
            });

            describe("when deleteFile rejects with ENOENT", () => {
              beforeEach(async () => {
                await deleteFileMock.resolveSpecific(
                  ["/some-directory-for-temp/kubeconfig-foo"],
                  Promise.reject(
                    Object.assign(new Error("file not found"), {
                      code: "ENOENT",
                    }),
                  ),
                );
              });

              it("should allow clear to resolve", async () => {
                await clearPromise;
              });
            });

            it("when deleteFile rejects with some other error; clear should also reject", async () => {
              const expectPromise = expect(clearPromise).rejects.toBeDefined();

              await deleteFileMock.reject(new Error("some other error"));
              await expectPromise;
            });
          });

          describe("when calling getPath a second time", () => {
            let getPathPromise: Promise<string>;

            beforeEach(async () => {
              getPathPromise = kubeConfManager.ensurePath();
            });

            it("should call pathExists", () => {
              expect(pathExistsMock).toBeCalledTimes(1);
            });

            describe("when pathExists resoves to true", () => {
              beforeEach(async () => {
                await pathExistsMock.resolveSpecific(["/some-directory-for-temp/kubeconfig-foo"], true);
              });

              it("always getPath to resolve with path", async () => {
                expect(await getPathPromise).toBe("/some-directory-for-temp/kubeconfig-foo");
              });
            });

            describe("when pathExists resoves to false", () => {
              beforeEach(async () => {
                await pathExistsMock.resolveSpecific(["/some-directory-for-temp/kubeconfig-foo"], false);
              });

              it("should call ensureServer on the cluster context", () => {
                expect(ensureServerMock).toBeCalledTimes(1);
              });

              describe("when ensureServer resolves", () => {
                beforeEach(async () => {
                  await ensureServerMock.resolve();
                });

                describe("when reading cluster's kubeconfig resolves", () => {
                  beforeEach(async () => {
                    await readFileMock.resolveSpecific(
                      ["/kind-config.yml"],
                      JSON.stringify({
                        apiVersion: "v1",
                        clusters: [
                          {
                            name: "kind-kind",
                            cluster: {
                              server: clusterServerUrl,
                            },
                          },
                        ],
                        contexts: [
                          {
                            context: {
                              cluster: "kind-kind",
                              user: "kind-kind",
                            },
                            name: "kind-kind",
                          },
                        ],
                        users: [
                          {
                            name: "kind-kind",
                          },
                        ],
                        kind: "Config",
                        preferences: {},
                      }),
                    );
                  });

                  describe("when writing out new proxy kubeconfig resolves", () => {
                    beforeEach(async () => {
                      await writeFileMock.resolveSpecific([
                        "/some-directory-for-temp/kubeconfig-foo",
                        "apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: PGNhLWRhdGE+\n    insecure-skip-tls-verify: false\n    server: https://127.0.0.1:9191/foo\n  name: kind-kind\ncontexts:\n- context:\n    cluster: kind-kind\n    user: proxy\n  name: kind-kind\ncurrent-context: kind-kind\nkind: Config\npreferences: {}\nusers:\n- name: proxy\n  user:\n    password: fake\n    username: lens\n",
                      ]);
                    });

                    it("should allow getPath to resolve with the path to the kubeconfig", async () => {
                      expect(await getPathPromise).toBe("/some-directory-for-temp/kubeconfig-foo");
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe("when 'Bypass Freelens Internal KubeApi Proxy' is enabled", () => {
    beforeEach(() => {
      const state = di.inject(userPreferencesStateInjectable);

      state.bypassKubeApiProxy = true;
    });

    describe("when ensurePath() is called", () => {
      let getPathPromise: Promise<string>;

      beforeEach(() => {
        getPathPromise = kubeConfManager.ensurePath();
      });

      it("does not start the kube-auth-proxy server", () => {
        expect(ensureServerMock).not.toBeCalled();
      });

      it("reads the original kubeconfig (not the proxied one)", async () => {
        await readFileMock.resolveSpecific(
          ["/kind-config.yml"],
          JSON.stringify({
            apiVersion: "v1",
            clusters: [
              { name: "kind-other", cluster: { server: "https://192.168.64.4:8443" } },
              { name: "kind-kind", cluster: { server: clusterServerUrl } },
            ],
            contexts: [
              { context: { cluster: "kind-other", user: "kind-other" }, name: "kind-other" },
              { context: { cluster: "kind-kind", user: "kind-kind" }, name: "kind-kind" },
            ],
            "current-context": "kind-other",
            users: [{ name: "kind-other" }, { name: "kind-kind" }],
            kind: "Config",
            preferences: {},
          }),
        );

        const [path, contents] = writeFileMock.mock.calls[0] ?? [];

        // Sanity-check: the kubeconfig used a different default context, but
        // the bypass file must pin current-context to the cluster being opened.
        expect(path).toBe("/some-directory-for-temp/kubeconfig-foo");
        expect(contents).toContain("current-context: kind-kind");
        expect(contents).not.toContain("current-context: kind-other");
      });

      it("writes a bypass kubeconfig that preserves every original context", async () => {
        await readFileMock.resolveSpecific(
          ["/kind-config.yml"],
          JSON.stringify({
            apiVersion: "v1",
            clusters: [
              { name: "kind-other", cluster: { server: "https://192.168.64.4:8443" } },
              { name: "kind-kind", cluster: { server: clusterServerUrl } },
            ],
            contexts: [
              { context: { cluster: "kind-other", user: "kind-other" }, name: "kind-other" },
              { context: { cluster: "kind-kind", user: "kind-kind" }, name: "kind-kind" },
            ],
            "current-context": "kind-other",
            users: [{ name: "kind-other" }, { name: "kind-kind" }],
            kind: "Config",
            preferences: {},
          }),
        );

        const [, contents] = writeFileMock.mock.calls[0] ?? [];

        expect(contents).toContain("name: kind-other");
        expect(contents).toContain("name: kind-kind");
      });

      it("returns the temp kubeconfig path (not the original kubeconfig path)", async () => {
        await readFileMock.resolveSpecific(
          ["/kind-config.yml"],
          JSON.stringify({
            apiVersion: "v1",
            clusters: [{ name: "kind-kind", cluster: { server: clusterServerUrl } }],
            contexts: [{ context: { cluster: "kind-kind", user: "kind-kind" }, name: "kind-kind" }],
            users: [{ name: "kind-kind" }],
            kind: "Config",
            preferences: {},
          }),
        );

        const [writePath] = writeFileMock.mock.calls[0] ?? [];

        await writeFileMock.resolveSpecific([writePath as string]);

        expect(await getPathPromise).toBe("/some-directory-for-temp/kubeconfig-foo");
      });

      it("preserves fields that a lossy copy would drop (proxy-url, tls-server-name, impersonation, exec)", async () => {
        await readFileMock.resolveSpecific(
          ["/kind-config.yml"],
          JSON.stringify({
            apiVersion: "v1",
            clusters: [
              {
                name: "kind-kind",
                cluster: {
                  server: clusterServerUrl,
                  "proxy-url": "socks5://127.0.0.1:1080",
                  "tls-server-name": "kubernetes.example.com",
                },
              },
            ],
            contexts: [{ context: { cluster: "kind-kind", user: "kind-kind" }, name: "kind-kind" }],
            users: [
              {
                name: "kind-kind",
                user: {
                  as: "admin",
                  exec: { command: "tsh", apiVersion: "client.authentication.k8s.io/v1beta1" },
                },
              },
            ],
            "current-context": "kind-kind",
            kind: "Config",
            preferences: {},
          }),
        );

        const [, contents] = writeFileMock.mock.calls[0] ?? [];
        const written = yaml.load(contents as string) as ParsedKubeconfig;

        expect(written.clusters[0].cluster["proxy-url"]).toBe("socks5://127.0.0.1:1080");
        expect(written.clusters[0].cluster["tls-server-name"]).toBe("kubernetes.example.com");
        expect(written.users[0].user.as).toBe("admin");
        expect((written.users[0].user.exec as { command: string }).command).toBe("tsh");
      });

      it("makes relative file paths absolute and keeps token-file as a live reference", async () => {
        await readFileMock.resolveSpecific(
          ["/kind-config.yml"],
          JSON.stringify({
            apiVersion: "v1",
            clusters: [
              {
                name: "kind-kind",
                cluster: { server: clusterServerUrl, "certificate-authority": "ca.crt" },
              },
            ],
            contexts: [{ context: { cluster: "kind-kind", user: "kind-kind" }, name: "kind-kind" }],
            users: [{ name: "kind-kind", user: { "client-key": "keys/client.key", "token-file": "token" } }],
            "current-context": "kind-kind",
            kind: "Config",
            preferences: {},
          }),
        );

        const [, contents] = writeFileMock.mock.calls[0] ?? [];
        const written = yaml.load(contents as string) as ParsedKubeconfig;

        // The original kubeconfig lives at "/kind-config.yml", so relative paths
        // resolve against "/".
        expect(written.clusters[0].cluster["certificate-authority"]).toBe("/ca.crt");
        expect(written.users[0].user["client-key"]).toBe("/keys/client.key");
        expect(written.users[0].user["token-file"]).toBe("/token");

        // token-file must stay a reference, not be inlined/frozen into a token.
        expect(written.users[0].user.token).toBeUndefined();
        expect(readFileMock).toBeCalledTimes(1);
      });
    });

    describe("when a default namespace is configured for the cluster", () => {
      beforeEach(() => {
        clusterFake.preferences.defaultNamespace = "team-a";
      });

      describe("when ensurePath() is called", () => {
        beforeEach(() => {
          kubeConfManager.ensurePath();
        });

        it("pins the namespace on the opened cluster's context", async () => {
          await readFileMock.resolveSpecific(
            ["/kind-config.yml"],
            JSON.stringify({
              apiVersion: "v1",
              clusters: [{ name: "kind-kind", cluster: { server: clusterServerUrl } }],
              contexts: [{ context: { cluster: "kind-kind", user: "kind-kind" }, name: "kind-kind" }],
              users: [{ name: "kind-kind" }],
              "current-context": "kind-kind",
              kind: "Config",
              preferences: {},
            }),
          );

          const [, contents] = writeFileMock.mock.calls[0] ?? [];
          const written = yaml.load(contents as string) as ParsedKubeconfig;
          const context = written.contexts.find((entry) => entry.name === "kind-kind");

          expect(context?.context.namespace).toBe("team-a");
        });
      });
    });
  });
});

interface ParsedKubeconfig {
  "current-context"?: string;
  clusters: { name: string; cluster: Record<string, string> }[];
  users: { name: string; user: Record<string, unknown> }[];
  contexts: { name: string; context: Record<string, string> }[];
}
