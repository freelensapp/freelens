/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { loggerInjectionToken } from "@freelensapp/logger";
import { runManyFor } from "@freelensapp/run-many";
import { observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import addClusterInjectable from "../../features/cluster/storage/common/add.injectable";
import clustersStateInjectable from "../../features/cluster/storage/common/state.injectable";
import catalogEntityRegistryInjectable from "../catalog/entity-registry.injectable";
import kubeconfigSyncManagerInjectable from "../catalog-sources/kubeconfig-sync/manager.injectable";
import spawnInjectable from "../child-process/spawn.injectable";
import freelensK8sProxyCertificateInjectable from "../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";
import waitUntilPortIsUsedInjectable from "../freelens-k8s-proxy/wait-until-port-is-used/wait-until-port-is-used.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import { onQuitOfBackEndInjectionToken } from "../start-main-application/runnable-tokens/phases";
import clusterConnectionInjectable from "./cluster-connection.injectable";
import freelensK8sProxyManagerInjectable from "./freelens-k8s-proxy-manager.injectable";
import { catalogEntityFromCluster } from "./manager";
import startDisconnectingClustersRemovedFromCatalogInjectable from "./start-disconnecting-clusters-removed-from-catalog.injectable";
import stopFreelensK8sProxiesOnQuitInjectable from "./stop-freelens-k8s-proxies-on-quit.injectable";
import type { ChildProcess } from "node:child_process";

import type { Logger } from "@freelensapp/logger";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IObservableArray } from "mobx";
import type { Mock } from "vitest";

import type { CatalogEntity } from "../../common/catalog";
import type { Cluster } from "../../common/cluster/cluster";
import type { KubeconfigSyncManager } from "../catalog-sources/kubeconfig-sync/manager";
import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";

interface FakeProxyProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: Mock;
}

describe("freelens-k8s-proxy of a removed cluster and on quit", () => {
  let di: DiContainer;
  let processes: Map<string, FakeProxyProcess>;
  let catalogSource: IObservableArray<CatalogEntity>;
  let someCluster: Cluster;
  let otherCluster: Cluster;
  let logger: Record<"debug" | "info" | "warn" | "error" | "silly", Mock>;

  // What a request through freelens-proxy does for a cluster: it gets a target
  // from the cluster's freelens-k8s-proxy manager, which starts the proxy if it
  // is not running.
  const requestThroughFreelensProxy = (cluster: Cluster) =>
    di.inject(freelensK8sProxyManagerInjectable, cluster).getApiTarget();

  const proxyKubeconfigClearOf = (cluster: Cluster) => di.inject(kubeconfigManagerInjectable, cluster).clear;

  const removeFromCatalog = (cluster: Cluster) =>
    runInAction(() => {
      catalogSource.replace(catalogSource.filter((entity) => entity.getId() !== cluster.id));
    });

  // The quit of the back end, limited to its runnables that touch the catalog
  // or the clusters: the others stop what this test never started. The stop of
  // the reaction goes last, so only its `runAfter` keeps the runnables that
  // empty the catalog from running before it.
  const quitRunnableIds = [
    "stop-kube-config-sync",
    "stop-all-extensions",
    "stop-all-cluster-connections-on-quit",
    "stop-freelens-k8s-proxies-on-quit",
    "stop-disconnecting-clusters-removed-from-catalog",
  ];

  const quit = () =>
    runManyFor({
      ...di,
      injectManyWithMeta: ((token: typeof onQuitOfBackEndInjectionToken) =>
        di
          .injectManyWithMeta(token)
          .filter(({ meta }) => quitRunnableIds.includes(meta.id))
          .sort(
            (left, right) => quitRunnableIds.indexOf(left.meta.id) - quitRunnableIds.indexOf(right.meta.id),
          )) as DiContainer["injectManyWithMeta"],
    })(onQuitOfBackEndInjectionToken)();

  beforeEach(async () => {
    di = getDiForUnitTesting();
    processes = new Map();

    let nextPort = 9001;

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-temp");
    di.override(
      spawnInjectable,
      () =>
        ((_command: string, _args: string[], options: { env: NodeJS.ProcessEnv }) => {
          const proxyProcess = Object.assign(new EventEmitter(), {
            stdout: new EventEmitter(),
            stderr: new EventEmitter(),
            kill: vi.fn(),
          });
          const port = nextPort++;

          processes.set(options.env.FREELENS_PROXY_CONTEXT as string, proxyProcess);
          queueMicrotask(() => proxyProcess.stdout.emit("data", `Starting to serve on 127.0.0.1:${port}`));

          return proxyProcess as unknown as ChildProcess;
        }) as any,
    );
    di.override(waitUntilPortIsUsedInjectable, () => async () => {});
    di.override(broadcastMessageInjectable, () => vi.fn());
    di.override(clusterApiUrlInjectable, () => async () => new URL("https://192.168.64.3:8443"));
    di.override(freelensK8sProxyCertificateInjectable, () =>
      Promise.resolve({ cert: "some-cert", private: "some-private-key", public: "some-public-key" }),
    );
    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePath: async () => "/some-proxy-kubeconfig-file",
          clear: vi.fn(async () => {}),
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      silly: vi.fn(),
    };
    di.override(loggerInjectionToken, () => logger as unknown as Logger);
    // What stopping the sync does on quit: removing its sources empties the catalog
    di.override(
      kubeconfigSyncManagerInjectable,
      () =>
        ({
          stopSync: () => runInAction(() => catalogSource.clear()),
        }) as Partial<KubeconfigSyncManager> as KubeconfigSyncManager,
    );

    const addCluster = di.inject(addClusterInjectable);

    someCluster = addCluster({
      id: "some-cluster-id",
      kubeConfigPath: "/some/kubeconfigs/proxytest",
      contextName: "some-context",
    });
    otherCluster = addCluster({
      id: "other-cluster-id",
      kubeConfigPath: "/some/kubeconfigs/other",
      contextName: "other-context",
    });

    catalogSource = observable.array([catalogEntityFromCluster(someCluster), catalogEntityFromCluster(otherCluster)]);
    di.inject(catalogEntityRegistryInjectable).addObservableSource("some-source", catalogSource);
    di.inject(startDisconnectingClustersRemovedFromCatalogInjectable).run();

    // Neither cluster connected: the proxies are the ones a request starts
    await requestThroughFreelensProxy(someCluster);
    await requestThroughFreelensProxy(otherCluster);
  });

  it("starts the proxies of the disconnected clusters", () => {
    expect(someCluster.disconnected.get()).toBe(true);
    expect([...processes.keys()]).toEqual(["some-context", "other-context"]);
  });

  describe("when a disconnected cluster leaves the catalog", () => {
    beforeEach(() => {
      removeFromCatalog(someCluster);
    });

    it("stops its proxy", () => {
      expect(processes.get("some-context")?.kill).toHaveBeenCalled();
    });

    it("removes its proxy kubeconfig", () => {
      expect(proxyKubeconfigClearOf(someCluster)).toHaveBeenCalled();
    });

    it("keeps the proxy of a cluster still in the catalog", () => {
      expect(processes.get("other-context")?.kill).not.toHaveBeenCalled();
      expect(proxyKubeconfigClearOf(otherCluster)).not.toHaveBeenCalled();
    });
  });

  describe("when a connected cluster leaves the catalog", () => {
    beforeEach(() => {
      runInAction(() => someCluster.disconnected.set(false));
      removeFromCatalog(someCluster);
    });

    it("stops its proxy", () => {
      expect(processes.get("some-context")?.kill).toHaveBeenCalled();
    });

    it("disconnects the cluster", () => {
      expect(someCluster.disconnected.get()).toBe(true);
    });
  });

  it("stops the proxy of a disconnected cluster when its connection is disconnected", () => {
    // What "Remove" in the catalog and a context removed from a kubeconfig file do
    di.inject(clusterConnectionInjectable, someCluster).disconnect();

    expect(processes.get("some-context")?.kill).toHaveBeenCalled();
    expect(processes.get("other-context")?.kill).not.toHaveBeenCalled();
  });

  describe("on quit", () => {
    it("runs the stop of the proxies on quit of the back end", () => {
      expect(di.injectMany(onQuitOfBackEndInjectionToken)).toContain(di.inject(stopFreelensK8sProxiesOnQuitInjectable));
    });

    it("stops the proxy of every cluster", async () => {
      await di.inject(stopFreelensK8sProxiesOnQuitInjectable).run();

      expect(processes.get("some-context")?.kill).toHaveBeenCalled();
      expect(processes.get("other-context")?.kill).toHaveBeenCalled();
    });

    it("disconnects no cluster when the quit empties the catalog", async () => {
      expect(di.injectManyWithMeta(onQuitOfBackEndInjectionToken).map(({ meta }) => meta.id)).toEqual(
        expect.arrayContaining(quitRunnableIds),
      );

      await quit();

      expect(catalogSource).toHaveLength(0);
      expect(logger.info).not.toHaveBeenCalledWith(
        "[CLUSTER]: cluster left the catalog, disconnecting",
        expect.anything(),
      );
      expect(proxyKubeconfigClearOf(someCluster)).not.toHaveBeenCalled();
      expect(proxyKubeconfigClearOf(otherCluster)).not.toHaveBeenCalled();
    });

    it("stops the proxy of a cluster that left the catalog and the storage", async () => {
      // Without its cluster in the storage, nothing but the quit reaches the proxy
      runInAction(() => {
        di.inject(clustersStateInjectable).clear();
        catalogSource.clear();
      });

      expect(processes.get("some-context")?.kill).not.toHaveBeenCalled();

      await di.inject(stopFreelensK8sProxiesOnQuitInjectable).run();

      expect(processes.get("some-context")?.kill).toHaveBeenCalled();
      expect(processes.get("other-context")?.kill).toHaveBeenCalled();
    });
  });
});
