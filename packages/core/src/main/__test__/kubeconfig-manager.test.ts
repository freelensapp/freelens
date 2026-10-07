/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import asyncFn from "@async-fn/vitest";
import { loggerInjectionToken } from "@freelensapp/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../common/cluster/cluster";
import ensureDirInjectable from "../../common/fs/ensure-dir.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../common/fs/path-exists-sync.injectable";
import readFileInjectable from "../../common/fs/read-file.injectable";
import readJsonSyncInjectable from "../../common/fs/read-json-sync.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import writeFileInjectable from "../../common/fs/write-file.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import normalizedPlatformInjectable from "../../common/vars/normalized-platform.injectable";
import freelensK8sProxyServerInjectable from "../cluster/freelens-k8s-proxy-server.injectable";
import freelensProxyPortInjectable from "../freelens-proxy/freelens-proxy-port.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import kubectlBinaryNameInjectable from "../kubectl/binary-name.injectable";
import kubectlDownloadingNormalizedArchInjectable from "../kubectl/normalized-arch.injectable";

import type { Logger } from "@freelensapp/logger";

import type { AsyncFnMock } from "@async-fn/vitest";
import type { DiContainer } from "@ogre-tools/injectable";
import type { Mocked, MockedFunction } from "vitest";

import type { EnsureDirectory } from "../../common/fs/ensure-dir.injectable";
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
  let ensureDirMock: MockedFunction<EnsureDirectory>;
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
    di.inject(freelensProxyPortInjectable).set(9191);

    readFileMock = asyncFn();
    di.override(readFileInjectable, () => readFileMock);
    writeFileMock = asyncFn();
    di.override(writeFileInjectable, () => writeFileMock);
    pathExistsMock = asyncFn();
    di.override(pathExistsInjectable, () => pathExistsMock);
    deleteFileMock = asyncFn();
    di.override(removePathInjectable, () => deleteFileMock);
    ensureDirMock = vi.fn(async () => {});
    di.override(ensureDirInjectable, () => ensureDirMock);

    loggerMock = {
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
    };

    di.override(loggerInjectionToken, () => loggerMock);

    ensureServerMock = asyncFn();

    di.override(freelensK8sProxyServerInjectable, () => ({
      restart: vi.fn(),
      stop: vi.fn(),
      getApiTarget: vi.fn(),
      ensureRunning: ensureServerMock,
      ensureFreelensK8sProxyUrl: vi.fn(),
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

          it("should create the cache directory next to the kubeconfig", () => {
            expect(ensureDirMock).toHaveBeenCalledExactlyOnceWith("/some-directory-for-temp/kubecache-foo");
          });

          it("should allow ensurePaths to resolve with the kubeconfig and its cache directory", async () => {
            const pathsPromise = kubeConfManager.ensurePaths();

            await pathExistsMock.resolveSpecific(["/some-directory-for-temp/kubeconfig-foo"], true);

            expect(await pathsPromise).toEqual({
              kubeconfigPath: "/some-directory-for-temp/kubeconfig-foo",
              cacheDirectoryPath: "/some-directory-for-temp/kubecache-foo",
            });
          });

          describe("when calling clear", () => {
            let clearPromise: Promise<void>;

            beforeEach(() => {
              clearPromise = kubeConfManager.clear();
            });

            it("should remove the kubeconfig and the cache directory without waiting for either", () => {
              expect(deleteFileMock).toHaveBeenCalledTimes(2);
              expect(deleteFileMock).toHaveBeenCalledWith("/some-directory-for-temp/kubeconfig-foo");
              expect(deleteFileMock).toHaveBeenCalledWith("/some-directory-for-temp/kubecache-foo");
            });

            describe("when both removals resolve", () => {
              beforeEach(async () => {
                await deleteFileMock.resolveSpecific(["/some-directory-for-temp/kubeconfig-foo"]);
                await deleteFileMock.resolveSpecific(["/some-directory-for-temp/kubecache-foo"]);
              });

              it("should allow clear to resolve", async () => {
                await clearPromise;
              });

              it("should not log a warning", () => {
                expect(loggerMock.warn).not.toHaveBeenCalled();
              });

              it("should not remove anything when called again", async () => {
                await kubeConfManager.clear();

                expect(deleteFileMock).toHaveBeenCalledTimes(2);
              });
            });

            describe.each(["EBUSY", "EPERM"])("when a removal rejects with %s", (code) => {
              const kubeconfig = "/some-directory-for-temp/kubeconfig-foo";
              const cacheDirectory = "/some-directory-for-temp/kubecache-foo";

              describe.each([
                { failing: "the kubeconfig", rejected: [kubeconfig] },
                { failing: "the cache directory", rejected: [cacheDirectory] },
                { failing: "both", rejected: [kubeconfig, cacheDirectory] },
              ])("for $failing", ({ rejected }) => {
                beforeEach(async () => {
                  for (const path of [kubeconfig, cacheDirectory]) {
                    await deleteFileMock.resolveSpecific(
                      [path],
                      rejected.includes(path)
                        ? Promise.reject(Object.assign(new Error(`${code}: resource busy or locked`), { code }))
                        : undefined,
                    );
                  }
                });

                it("should allow clear to resolve", async () => {
                  await clearPromise;
                });

                it("should still attempt both removals, once each", () => {
                  expect(deleteFileMock).toHaveBeenCalledTimes(2);
                  expect(deleteFileMock).toHaveBeenCalledWith(kubeconfig);
                  expect(deleteFileMock).toHaveBeenCalledWith(cacheDirectory);
                });

                it("should log a warning for each failed removal", () => {
                  expect(loggerMock.warn).toHaveBeenCalledTimes(rejected.length);
                });

                it("should create the kubeconfig again on the next ensurePath", () => {
                  void kubeConfManager.ensurePath();

                  expect(pathExistsMock).not.toHaveBeenCalled();
                  expect(ensureServerMock).toHaveBeenCalledTimes(1);
                });
              });
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
});
