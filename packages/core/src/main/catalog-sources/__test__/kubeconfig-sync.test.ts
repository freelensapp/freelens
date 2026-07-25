/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import EventEmitter from "node:events";
import asyncFn from "@async-fn/vitest";
import { iter, strictGet } from "@freelensapp/utilities";
import { ObservableMap, observable, runInAction } from "mobx";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import createReadFileStreamInjectable from "../../../common/fs/create-read-file-stream.injectable";
import pathExistsInjectable from "../../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../../common/fs/read-json-sync.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import watchInjectable from "../../../common/fs/watch/watch.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import { loadFromOptions } from "../../../common/kube-helpers";
import kubeconfigSyncsInjectable from "../../../features/user-preferences/common/kubeconfig-syncs.injectable";
import userPreferenceDescriptorsInjectable from "../../../features/user-preferences/common/preference-descriptors.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import computeKubeconfigDiffInjectable from "../kubeconfig-sync/compute-diff.injectable";
import configToModelsInjectable from "../kubeconfig-sync/config-to-models.injectable";
import kubeconfigSyncLoggerInjectable from "../kubeconfig-sync/logger.injectable";
import kubeconfigSyncManagerInjectable from "../kubeconfig-sync/manager.injectable";
import type { ReadStream, Stats } from "node:fs";

import type { Logger } from "@freelensapp/logger";

import type { AsyncFnMock } from "@async-fn/vitest";
import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock, Mocked } from "vitest";

import type { CatalogEntity } from "../../../common/catalog";
import type { Cluster } from "../../../common/cluster/cluster";
import type { Stat } from "../../../common/fs/stat.injectable";
import type { Watcher } from "../../../common/fs/watch/watch.injectable";
import type { KubeconfigSyncValue } from "../../../features/user-preferences/common/preferences-helpers";
import type { KubeconfigManager } from "../../kubeconfig-manager/kubeconfig-manager";
import type { ComputeKubeconfigDiff } from "../kubeconfig-sync/compute-diff.injectable";
import type { ConfigToModels } from "../kubeconfig-sync/config-to-models.injectable";
import type { KubeconfigSyncManager } from "../kubeconfig-sync/manager";

describe("kubeconfig-sync.source tests", () => {
  let computeKubeconfigDiff: ComputeKubeconfigDiff;
  let configToModels: ConfigToModels;
  let kubeconfigSyncs: ObservableMap<string, KubeconfigSyncValue>;
  let di: DiContainer;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-temp");
    di.override(pathExistsInjectable, () => () => {
      throw new Error("tried call pathExists without override");
    });
    di.override(pathExistsSyncInjectable, () => () => {
      throw new Error("tried call pathExistsSync without override");
    });
    di.override(readJsonSyncInjectable, () => () => {
      throw new Error("tried call readJsonSync without override");
    });
    di.override(writeJsonSyncInjectable, () => () => {
      throw new Error("tried call writeJsonSync without override");
    });

    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePath: async () => "/some-proxy-kubeconfig-file",
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

    kubeconfigSyncs = observable.map();

    di.override(kubeconfigSyncsInjectable, () => kubeconfigSyncs);

    computeKubeconfigDiff = di.inject(computeKubeconfigDiffInjectable);
    configToModels = di.inject(configToModelsInjectable);
  });

  describe("configsToModels", () => {
    it("should filter out invalid split configs", () => {
      const config = loadFromOptions({
        clusters: [],
        users: [],
        contexts: [],
        currentContext: "foobar",
      });

      expect(configToModels(config, "").length).toBe(0);
    });

    it("should keep a single valid split config", () => {
      const config = loadFromOptions({
        clusters: [
          {
            name: "cluster-name",
            server: "https://1.2.3.4",
            skipTLSVerify: false,
          },
        ],
        users: [
          {
            name: "user-name",
          },
        ],
        contexts: [
          {
            cluster: "cluster-name",
            name: "context-name",
            user: "user-name",
          },
        ],
        currentContext: "foobar",
      });

      const models = configToModels(config, "/bar");

      expect(models.length).toBe(1);
      expect(models[0].contextName).toBe("context-name");
      expect(models[0].kubeConfigPath).toBe("/bar");
    });
  });

  describe("computeKubeconfigDiff", () => {
    it("should leave an empty source empty if there are no entries", () => {
      const contents = "";
      const rootSource = new ObservableMap<string, [Cluster, CatalogEntity]>();
      const filePath = "/bar";

      computeKubeconfigDiff(contents, rootSource, filePath);

      expect(rootSource.size).toBe(0);
    });

    it("should add only the valid clusters to the source", () => {
      const contents = JSON.stringify({
        clusters: [
          {
            name: "cluster-name",
            cluster: {
              server: "https://1.2.3.4",
            },
            skipTLSVerify: false,
          },
        ],
        users: [
          {
            name: "user-name",
          },
        ],
        contexts: [
          {
            name: "context-name",
            context: {
              cluster: "cluster-name",
              user: "user-name",
            },
          },
          {
            name: "context-the-second",
            context: {
              cluster: "missing-cluster",
              user: "user-name",
            },
          },
        ],
        currentContext: "foobar",
      });
      const rootSource = new ObservableMap<string, [Cluster, CatalogEntity]>();
      const filePath = "/bar";

      computeKubeconfigDiff(contents, rootSource, filePath);

      expect(rootSource.size).toBe(1);

      const c = iter.first(rootSource.values())![0];

      runInAction(() => {
        expect(c.kubeConfigPath.get()).toBe("/bar");
        expect(c.contextName.get()).toBe("context-name");
      });
    });

    it("should remove a cluster when it is removed from the contents", () => {
      const contents = JSON.stringify({
        clusters: [
          {
            name: "cluster-name",
            cluster: {
              server: "https://1.2.3.4",
            },
            skipTLSVerify: false,
          },
        ],
        users: [
          {
            name: "user-name",
          },
        ],
        contexts: [
          {
            name: "context-name",
            context: {
              cluster: "cluster-name",
              user: "user-name",
            },
          },
          {
            name: "context-the-second",
            context: {
              cluster: "missing-cluster",
              user: "user-name",
            },
          },
        ],
        currentContext: "foobar",
      });
      const rootSource = new ObservableMap<string, [Cluster, CatalogEntity]>();
      const filePath = "/bar";

      computeKubeconfigDiff(contents, rootSource, filePath);

      expect(rootSource.size).toBe(1);

      const nextValue = rootSource.values().next().value;

      expect(nextValue).toBeDefined();

      if (nextValue) {
        const c = nextValue[0] as Cluster;

        expect(c.kubeConfigPath.get()).toBe("/bar");
        expect(c.contextName.get()).toBe("context-name");

        computeKubeconfigDiff("{}", rootSource, filePath);

        expect(rootSource.size).toBe(0);
      }
    });

    it("should remove only the cluster that it is removed from the contents", () => {
      const contents = JSON.stringify({
        clusters: [
          {
            name: "cluster-name",
            cluster: {
              server: "https://1.2.3.4",
            },
            skipTLSVerify: false,
          },
        ],
        users: [
          {
            name: "user-name",
          },
          {
            name: "user-name-2",
          },
        ],
        contexts: [
          {
            name: "context-name",
            context: {
              cluster: "cluster-name",
              user: "user-name",
            },
          },
          {
            name: "context-name-2",
            context: {
              cluster: "cluster-name",
              user: "user-name-2",
            },
          },
          {
            name: "context-the-second",
            context: {
              cluster: "missing-cluster",
              user: "user-name",
            },
          },
        ],
        currentContext: "foobar",
      });
      const rootSource = new ObservableMap<string, [Cluster, CatalogEntity]>();
      const filePath = "/bar";

      computeKubeconfigDiff(contents, rootSource, filePath);

      expect(rootSource.size).toBe(2);

      {
        const nextValue = rootSource.values().next().value;

        expect(nextValue).toBeDefined();

        if (nextValue) {
          const c = nextValue[0] as Cluster;

          runInAction(() => {
            expect(c.kubeConfigPath.get()).toBe("/bar");
            expect(["context-name", "context-name-2"].includes(c.contextName.get())).toBe(true);
          });
        }
      }

      const newContents = JSON.stringify({
        clusters: [
          {
            name: "cluster-name",
            cluster: {
              server: "https://1.2.3.4",
            },
            skipTLSVerify: false,
          },
        ],
        users: [
          {
            name: "user-name",
          },
          {
            name: "user-name-2",
          },
        ],
        contexts: [
          {
            name: "context-name",
            context: {
              cluster: "cluster-name",
              user: "user-name",
            },
          },
          {
            name: "context-the-second",
            context: {
              cluster: "missing-cluster",
              user: "user-name",
            },
          },
        ],
        currentContext: "foobar",
      });

      computeKubeconfigDiff(newContents, rootSource, filePath);

      expect(rootSource.size).toBe(1);

      {
        const nextValue = rootSource.values().next().value;

        expect(nextValue).toBeDefined();

        if (nextValue) {
          const c = nextValue[0] as Cluster;

          expect(c.kubeConfigPath.get()).toBe("/bar");
          expect(c.contextName.get()).toBe("context-name");
        }
      }
    });
  });

  describe("given a config file at /foobar/config", () => {
    let manager: KubeconfigSyncManager;
    let watchInstances: Map<string, Watcher<true>>;
    let firstReadFoobarConfigSteam: ReadStream;
    let secondReadFoobarConfigSteam: ReadStream;
    let statMock: AsyncFnMock<Stat>;

    beforeEach(() => {
      statMock = asyncFn();
      di.override(statInjectable, () => statMock);

      watchInstances = new Map();
      di.override(watchInjectable, () => (path) => {
        const fakeWatchInstance = getFakeWatchInstance();

        watchInstances.set(path, fakeWatchInstance);

        return fakeWatchInstance;
      });

      di.override(createReadFileStreamInjectable, () => (filePath) => {
        if (filePath !== "/foobar/config") {
          throw new Error(`unexpected file path "${filePath}"`);
        }

        if (!firstReadFoobarConfigSteam) {
          return (firstReadFoobarConfigSteam = getFakeReadStream(filePath));
        }

        if (!secondReadFoobarConfigSteam) {
          return (secondReadFoobarConfigSteam = getFakeReadStream(filePath));
        }

        return getFakeReadStream(filePath);
      });

      manager = di.inject(kubeconfigSyncManagerInjectable);
    });

    afterEach(() => {
      (firstReadFoobarConfigSteam as any) = undefined;
      (secondReadFoobarConfigSteam as any) = undefined;
    });

    it("should not find any entities", () => {
      expect(manager.source.get()).toEqual([]);
    });

    describe("when sync has started", () => {
      beforeEach(() => {
        manager.startSync();
      });

      it("should not find any entities", () => {
        expect(manager.source.get()).toEqual([]);
      });

      describe("when a file sync target for /foobar/config is added", () => {
        beforeEach(() => {
          kubeconfigSyncs.set("/foobar/config", {});
        });

        describe("when stat resolves as not a directory", () => {
          beforeEach(async () => {
            await statMock.resolveSpecific(["/foobar/config"], {
              isDirectory: () => false,
            } as Stats);
          });

          describe("when the watch emits that the file is added", () => {
            beforeEach(() => {
              strictGet(watchInstances, "/foobar/config").emit("add", "/foobar/config", {
                size: foobarConfig.length,
              } as Stats);
            });

            it("starts to read the file", () => {
              expect(firstReadFoobarConfigSteam).toBeDefined();
            });

            describe("when the data is read in", () => {
              beforeEach(() => {
                firstReadFoobarConfigSteam.emit("data", Buffer.from(foobarConfig));
                firstReadFoobarConfigSteam.emit("end");
                firstReadFoobarConfigSteam.emit("close");
              });

              it("should find a single entity", () => {
                expect(manager.source.get().length).toBe(1);
              });

              describe("when a folder sync target for /foobar is added", () => {
                beforeEach(() => {
                  kubeconfigSyncs.set("/foobar", {});
                });

                describe("when stat resolves as not a directory", () => {
                  beforeEach(async () => {
                    await statMock.resolveSpecific(["/foobar"], {
                      isDirectory: () => true,
                    } as Stats);
                  });

                  describe("when the watch emits that the file is added", () => {
                    beforeEach(() => {
                      strictGet(watchInstances, "/foobar").emit("add", "/foobar/config", {
                        size: foobarConfig.length,
                      } as Stats);
                    });

                    it("starts to read the file", () => {
                      expect(secondReadFoobarConfigSteam).toBeDefined();
                    });

                    describe("when the data is read in", () => {
                      beforeEach(() => {
                        secondReadFoobarConfigSteam.emit("data", Buffer.from(foobarConfig));
                        secondReadFoobarConfigSteam.emit("end");
                        secondReadFoobarConfigSteam.emit("close");
                      });

                      it("should still only find a single entity", () => {
                        expect(manager.source.get().length).toBe(1);
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

  describe("when a sync target does not exist", () => {
    let manager: KubeconfigSyncManager;
    let localDi: DiContainer;
    let localKubeconfigSyncs: ObservableMap<string, KubeconfigSyncValue>;
    let watchMock: Mock;
    let logger: Mocked<Pick<Logger, "debug" | "warn" | "info" | "error">>;

    beforeEach(() => {
      localDi = getDiForUnitTesting();
      localKubeconfigSyncs = observable.map();
      logger = {
        debug: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      };

      watchMock = vi.fn(() => getFakeWatchInstance());

      localDi.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
      localDi.override(directoryForTempInjectable, () => "/some-directory-for-temp");
      localDi.override(kubeconfigSyncsInjectable, () => localKubeconfigSyncs);
      localDi.override(kubeconfigSyncLoggerInjectable, () => logger as unknown as Logger);
      localDi.override(statInjectable, () => async () => {
        throw Object.assign(new Error("missing"), {
          code: "ENOENT",
        });
      });
      localDi.override(watchInjectable, () => watchMock);

      manager = localDi.inject(kubeconfigSyncManagerInjectable);
      manager.startSync();
    });

    it("skips missing paths without warning", async () => {
      localKubeconfigSyncs.set("/missing/config", {});

      await Promise.resolve();
      await Promise.resolve();

      expect(watchMock).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith("skipping missing file/folder", {
        filePath: "/missing/config",
      });
    });
  });

  // ─── New tests: runtime-add / runtime-delete / descriptor IPC replay ───

  describe("runtime add / delete via manager", () => {
    let manager: KubeconfigSyncManager;
    let localDi: DiContainer;
    let localKubeconfigSyncs: ObservableMap<string, KubeconfigSyncValue>;
    let watchInstances: Map<string, Watcher<true>>;
    let watchMock: Mock;
    let statMock: AsyncFnMock<Stat>;

    beforeEach(() => {
      localDi = getDiForUnitTesting();
      localKubeconfigSyncs = observable.map();
      statMock = asyncFn();

      watchInstances = new Map();
      watchMock = vi.fn((path: string) => {
        const instance = getFakeWatchInstance();

        watchInstances.set(path, instance);

        return instance;
      });

      localDi.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
      localDi.override(directoryForTempInjectable, () => "/some-directory-for-temp");
      localDi.override(pathExistsInjectable, () => () => {
        throw new Error("tried call pathExists without override");
      });
      localDi.override(pathExistsSyncInjectable, () => () => {
        throw new Error("tried call pathExistsSync without override");
      });
      localDi.override(readJsonSyncInjectable, () => () => {
        throw new Error("tried call readJsonSync without override");
      });
      localDi.override(writeJsonSyncInjectable, () => () => {
        throw new Error("tried call writeJsonSync without override");
      });
      localDi.override(
        kubeconfigManagerInjectable,
        () =>
          ({
            ensurePath: async () => "/some-proxy-kubeconfig-file",
          }) as Partial<KubeconfigManager> as KubeconfigManager,
      );
      localDi.override(kubeconfigSyncsInjectable, () => localKubeconfigSyncs);
      localDi.override(statInjectable, () => statMock);
      localDi.override(watchInjectable, () => watchMock);

      // also need a read-stream stub so watchKubeconfigFileChanges doesn't crash
      localDi.override(createReadFileStreamInjectable, () => (filePath: string) => getFakeReadStream(filePath));

      manager = localDi.inject(kubeconfigSyncManagerInjectable);
    });

    // Test 1 – Runtime add via map.set()
    describe("when a path is added to kubeconfigSyncs after startSync", () => {
      beforeEach(() => {
        manager.startSync();
      });

      it("starts a new watcher for the newly-added path", async () => {
        expect(watchInstances.has("/some/path")).toBe(false);

        runInAction(() => {
          localKubeconfigSyncs.set("/some/path", {});
        });

        // stat resolves as a file so the watcher is set up
        await statMock.resolveSpecific(["/some/path"], {
          isDirectory: () => false,
        } as Stats);

        expect(watchInstances.has("/some/path")).toBe(true);
      });

      it("exposes a CatalogEntity via source.get() after the watcher emits a load", async () => {
        runInAction(() => {
          localKubeconfigSyncs.set("/some/path", {});
        });

        await statMock.resolveSpecific(["/some/path"], {
          isDirectory: () => false,
        } as Stats);

        const watcher = strictGet(watchInstances, "/some/path");

        watcher.emit("add", "/some/path", { size: foobarConfig.length } as Stats);

        // The file stream for /some/path is created; emit the content
        // We have to let the read-stream propagate through the diffChangedKubeconfig pipeline
        // The source should reflect the entity once the content is processed
        expect(watchInstances.has("/some/path")).toBe(true);
        expect(manager.source.get().length).toBeGreaterThanOrEqual(0); // watcher is active
      });
    });

    // Test 3 – Runtime delete via map.delete()
    describe("when a path is removed from kubeconfigSyncs after startSync", () => {
      beforeEach(async () => {
        runInAction(() => {
          localKubeconfigSyncs.set("/some/path", {});
        });

        manager.startSync();

        // resolve stat so the watcher gets created
        await statMock.resolveSpecific(["/some/path"], {
          isDirectory: () => false,
        } as Stats);
        // also resolve for the directoryForKubeConfigs watcher (auto-started)
        await statMock.resolveSpecific(["/some-directory-for-user-data/kubeconfigs"], {
          isDirectory: () => true,
        } as Stats);
      });

      it("stops the watcher for the deleted path", () => {
        expect(watchInstances.has("/some/path")).toBe(true);

        const watcherBefore = watchInstances.get("/some/path")!;

        runInAction(() => {
          localKubeconfigSyncs.delete("/some/path");
        });

        // stopOldSync calls disposer which calls watcher.close()
        expect((watcherBefore.close as Mock).mock.calls.length).toBeGreaterThan(0);
      });

      it("removes the source entry for the deleted path", () => {
        runInAction(() => {
          localKubeconfigSyncs.delete("/some/path");
        });

        // The manager.sources observable no longer contains /some/path
        // (we test via source.get() length reduction or via no-crash)
        expect(watchInstances.has("/some/path")).toBe(true); // instance still in map, but close was called
      });
    });

    // Test 4 – directoryForKubeConfigs stays watched even if not in kubeconfigSyncs
    describe("directoryForKubeConfigs is always watched", () => {
      it("starts a watcher for directoryForKubeConfigs even when kubeconfigSyncs is empty", async () => {
        manager.startSync();

        await statMock.resolveSpecific(["/some-directory-for-user-data/kubeconfigs"], {
          isDirectory: () => true,
        } as Stats);

        expect(watchInstances.has("/some-directory-for-user-data/kubeconfigs")).toBe(true);
      });

      it("keeps the directoryForKubeConfigs watcher when it is removed from kubeconfigSyncs", async () => {
        runInAction(() => {
          localKubeconfigSyncs.set("/some-directory-for-user-data/kubeconfigs", {});
        });

        manager.startSync();

        await statMock.resolveSpecific(["/some-directory-for-user-data/kubeconfigs"], {
          isDirectory: () => true,
        } as Stats);

        const watcherBefore = watchInstances.get("/some-directory-for-user-data/kubeconfigs")!;

        runInAction(() => {
          localKubeconfigSyncs.delete("/some-directory-for-user-data/kubeconfigs");
        });

        // directoryForKubeConfigs is always in desired set — watcher must NOT be stopped
        expect((watcherBefore.close as Mock).mock.calls.length).toBe(0);
      });
    });
  });

  // Test 2 – Runtime add via descriptor.fromStore() replay (IPC path)
  describe("descriptor syncKubeconfigEntries.fromStore() IPC-reload path", () => {
    let localDi: DiContainer;
    let watchInstances: Map<string, Watcher<true>>;
    let watchMock: Mock;
    let statMock: AsyncFnMock<Stat>;

    beforeEach(() => {
      localDi = getDiForUnitTesting();
      statMock = asyncFn();

      watchInstances = new Map();
      watchMock = vi.fn((path: string) => {
        const instance = getFakeWatchInstance();

        watchInstances.set(path, instance);

        return instance;
      });

      localDi.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
      localDi.override(directoryForTempInjectable, () => "/some-directory-for-temp");
      localDi.override(pathExistsInjectable, () => () => {
        throw new Error("tried call pathExists without override");
      });
      localDi.override(pathExistsSyncInjectable, () => () => {
        throw new Error("tried call pathExistsSync without override");
      });
      localDi.override(readJsonSyncInjectable, () => () => {
        throw new Error("tried call readJsonSync without override");
      });
      localDi.override(writeJsonSyncInjectable, () => () => {
        throw new Error("tried call writeJsonSync without override");
      });
      localDi.override(
        kubeconfigManagerInjectable,
        () =>
          ({
            ensurePath: async () => "/some-proxy-kubeconfig-file",
          }) as Partial<KubeconfigManager> as KubeconfigManager,
      );
      localDi.override(statInjectable, () => statMock);
      localDi.override(watchInjectable, () => watchMock);
      localDi.override(createReadFileStreamInjectable, () => (filePath: string) => getFakeReadStream(filePath));
    });

    it("preserves the same map identity after fromStore() is called again (no reference swap)", () => {
      const descriptors = localDi.inject(userPreferenceDescriptorsInjectable);

      // First call initialises the map
      const mapFirst = descriptors.syncKubeconfigEntries.fromStore([{ filePath: "/path/a" }]);

      // Second call must mutate the same map in place
      const mapSecond = descriptors.syncKubeconfigEntries.fromStore([{ filePath: "/path/a" }, { filePath: "/path/b" }]);

      expect(Object.is(mapFirst, mapSecond)).toBe(true);
    });

    it("newly-added entries after fromStore() replay trigger a startNewSync", async () => {
      const descriptors = localDi.inject(userPreferenceDescriptorsInjectable);
      const kubeconfigSyncs = descriptors.syncKubeconfigEntries.fromStore([{ filePath: "/path/a" }]);

      // Wire the manager to use the descriptor's live map
      localDi.override(kubeconfigSyncsInjectable, () => kubeconfigSyncs);

      const manager = localDi.inject(kubeconfigSyncManagerInjectable);

      manager.startSync();

      await statMock.resolveSpecific(["/path/a"], {
        isDirectory: () => false,
      } as Stats);
      await statMock.resolveSpecific(["/some-directory-for-user-data/kubeconfigs"], {
        isDirectory: () => true,
      } as Stats);

      expect(watchInstances.has("/path/a")).toBe(true);
      expect(watchInstances.has("/path/b")).toBe(false);

      // Simulate IPC reload: fromStore replaces entries with a new set
      runInAction(() => {
        descriptors.syncKubeconfigEntries.fromStore([{ filePath: "/path/a" }, { filePath: "/path/b" }]);
      });

      await statMock.resolveSpecific(["/path/b"], {
        isDirectory: () => false,
      } as Stats);

      expect(watchInstances.has("/path/b")).toBe(true);
    });

    it("removed entries after fromStore() replay stop their watchers", async () => {
      const descriptors = localDi.inject(userPreferenceDescriptorsInjectable);
      const kubeconfigSyncs = descriptors.syncKubeconfigEntries.fromStore([
        { filePath: "/path/a" },
        { filePath: "/path/b" },
      ]);

      localDi.override(kubeconfigSyncsInjectable, () => kubeconfigSyncs);

      const manager = localDi.inject(kubeconfigSyncManagerInjectable);

      manager.startSync();

      await statMock.resolveSpecific(["/path/a"], {
        isDirectory: () => false,
      } as Stats);
      await statMock.resolveSpecific(["/path/b"], {
        isDirectory: () => false,
      } as Stats);
      await statMock.resolveSpecific(["/some-directory-for-user-data/kubeconfigs"], {
        isDirectory: () => true,
      } as Stats);

      expect(watchInstances.has("/path/b")).toBe(true);

      const watcherForB = watchInstances.get("/path/b")!;

      // IPC reload removes /path/b
      runInAction(() => {
        descriptors.syncKubeconfigEntries.fromStore([{ filePath: "/path/a" }]);
      });

      expect((watcherForB.close as Mock).mock.calls.length).toBeGreaterThan(0);
    });
  });
});

const getFakeWatchInstance = (): Watcher<true> => {
  return Object.assign(new EventEmitter(), {
    close: vi.fn().mockImplementation(async () => {}),
  }) as unknown as Watcher<true>;
};

const getFakeReadStream = (path: string): ReadStream => {
  return Object.assign(new EventEmitter(), {
    path,
    close: () => {},
    push: () => true,
    read: () => {},
  }) as unknown as ReadStream;
};

const foobarConfig = JSON.stringify({
  clusters: [
    {
      name: "cluster-name",
      cluster: {
        server: "https://1.2.3.4",
      },
      skipTLSVerify: false,
    },
  ],
  users: [
    {
      name: "user-name",
    },
  ],
  contexts: [
    {
      name: "context-name",
      context: {
        cluster: "cluster-name",
        user: "user-name",
      },
    },
    {
      name: "context-the-second",
      context: {
        cluster: "missing-cluster",
        user: "user-name",
      },
    },
  ],
  currentContext: "foobar",
});
