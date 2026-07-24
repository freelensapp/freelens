/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import createCanIInjectable from "../../common/cluster/create-can-i.injectable";
import createRequestNamespaceListPermissionsInjectable from "../../common/cluster/create-request-namespace-list-permissions.injectable";
import createListNamespacesInjectable from "../../common/cluster/list-namespaces.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import normalizedPlatformInjectable from "../../common/vars/normalized-platform.injectable";
import addClusterInjectable from "../../features/cluster/storage/common/add.injectable";
import broadcastConnectionUpdateInjectable from "../cluster/broadcast-connection-update.injectable";
import clusterConnectionInjectable from "../cluster/cluster-connection.injectable";
import kubeAuthProxyServerInjectable from "../cluster/kube-auth-proxy-server.injectable";
import prometheusHandlerInjectable from "../cluster/prometheus-handler/prometheus-handler.injectable";
import powerMonitorInjectable from "../electron-app/features/power-monitor.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import kubectlBinaryNameInjectable from "../kubectl/binary-name.injectable";
import { Kubectl } from "../kubectl/kubectl";
import kubectlDownloadingNormalizedArchInjectable from "../kubectl/normalized-arch.injectable";
import type EventEmitter from "events";

import type { DiContainer } from "@ogre-tools/injectable";

import type { Cluster } from "../../common/cluster/cluster";
import type { ClusterConnection } from "../cluster/cluster-connection.injectable";
import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";

describe("create clusters", () => {
  let cluster: Cluster;
  let clusterConnection: ClusterConnection;
  let powerMonitor: EventEmitter;
  let mockProxyServer: any;
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
    const writeJsonSync = di.inject(writeJsonSyncInjectable);

    di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "some-directory-for-temp");
    di.override(kubectlBinaryNameInjectable, () => "kubectl");
    di.override(kubectlDownloadingNormalizedArchInjectable, () => "amd64");
    di.override(normalizedPlatformInjectable, () => "darwin");
    di.override(broadcastConnectionUpdateInjectable, () => async () => {});
    di.override(createCanIInjectable, () => () => () => Promise.resolve(true));
    di.override(createRequestNamespaceListPermissionsInjectable, () => () => async () => () => true);
    di.override(createListNamespacesInjectable, () => () => () => Promise.resolve(["default"]));
    di.override(prometheusHandlerInjectable, () => ({
      getPrometheusDetails: vi.fn(),
      setupPrometheus: vi.fn(),
    }));

    writeJsonSync("/kind-config.yml", {
      apiVersion: "v1",
      clusters: [
        {
          name: "kind",
          cluster: {
            server: "https://192.168.64.3:8443",
          },
        },
      ],
      "current-context": "kind",
      contexts: [
        {
          context: {
            cluster: "kind",
            user: "kind",
          },
          name: "kind",
        },
      ],
      users: [
        {
          name: "kind",
        },
      ],
      kind: "Config",
      preferences: {},
    });

    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePath: async () => "/some-proxy-kubeconfig-file",
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

    vi.spyOn(Kubectl.prototype, "ensureKubectl").mockReturnValue(Promise.resolve(true));

    mockProxyServer = { start: jest.fn(), stop: jest.fn(), restart: jest.fn() };
    di.override(kubeAuthProxyServerInjectable, () => mockProxyServer);

    const addCluster = di.inject(addClusterInjectable);

    cluster = addCluster({
      id: "foo",
      contextName: "kind",
      kubeConfigPath: "/kind-config.yml",
    });
    powerMonitor = di.inject(powerMonitorInjectable) as any;
    clusterConnection = di.inject(clusterConnectionInjectable, cluster);
  });

  it("reconnect should not throw if contextHandler is missing", () => {
    expect(() => clusterConnection.reconnect()).not.toThrowError();
  });

  it("disconnect should not throw if contextHandler is missing", () => {
    expect(() => clusterConnection.disconnect()).not.toThrowError();
  });

  it("activating cluster should try to connect to cluster and do a refresh", async () => {
    vi.spyOn(clusterConnection, "reconnect").mockImplementation(async () => {});
    vi.spyOn(clusterConnection, "refreshConnectionStatus").mockImplementation(async () => {});

    await clusterConnection.activate();

    expect(clusterConnection.reconnect).toBeCalled();
    expect(clusterConnection.refreshConnectionStatus).toBeCalled();
  });

  it("should stop proxy on system suspend and reconnect on resume", async () => {
    jest.spyOn(clusterConnection, "reconnect").mockImplementation(async () => {});
    jest.spyOn(clusterConnection, "refreshConnectionStatus").mockImplementation(async () => {});

    await clusterConnection.activate();

    powerMonitor.emit("suspend");
    expect(mockProxyServer.stop).toBeCalled();
    // @ts-ignore
    expect(clusterConnection.isSystemSuspended).toBe(true);

    powerMonitor.emit("resume");
    // @ts-ignore
    expect(clusterConnection.isSystemSuspended).toBe(false);
    // reconnect called in activate AND in resume, so toBeCalledTimes >= 2
    expect(clusterConnection.reconnect).toBeCalled();
  });
});
