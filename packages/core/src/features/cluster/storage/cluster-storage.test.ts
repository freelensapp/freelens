/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import type { DiContainer } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import type { GetCustomKubeConfigFilePath } from "../../../common/app-paths/get-custom-kube-config-directory/get-custom-kube-config-directory.injectable";
import getCustomKubeConfigFilePathInjectable from "../../../common/app-paths/get-custom-kube-config-directory/get-custom-kube-config-directory.injectable";
import type { Cluster } from "../../../common/cluster/cluster";
import type { ReadFileSync } from "../../../common/fs/read-file-sync.injectable";
import readFileSyncInjectable from "../../../common/fs/read-file-sync.injectable";
import type { WriteFileSync } from "../../../common/fs/write-file-sync.injectable";
import writeFileSyncInjectable from "../../../common/fs/write-file-sync.injectable";
import type { WriteJsonSync } from "../../../common/fs/write-json-sync.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import normalizedPlatformInjectable from "../../../common/vars/normalized-platform.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import kubectlBinaryNameInjectable from "../../../main/kubectl/binary-name.injectable";
import kubectlDownloadingNormalizedArchInjectable from "../../../main/kubectl/normalized-arch.injectable";
import type { PersistentStorage } from "../../persistent-storage/common/create.injectable";
import type { AddCluster } from "./common/add.injectable";
import addClusterInjectable from "./common/add.injectable";
import clustersInjectable from "./common/clusters.injectable";
import type { GetClusterById } from "./common/get-by-id.injectable";
import getClusterByIdInjectable from "./common/get-by-id.injectable";
import clustersPersistentStorageInjectable from "./common/storage.injectable";

// NOTE: this is intended to read the actual file system
const clusterServerUrl = "https://localhost";
const kubeconfig = `
apiVersion: v1
clusters:
- cluster:
    server: ${clusterServerUrl}
  name: test
contexts:
- context:
    cluster: test
    user: test
  name: foo
- context:
    cluster: test
    user: test
  name: foo2
current-context: test
kind: Config
preferences: {}
users:
- name: test
  user:
    token: kubeconfig-user-q4lm4:xxxyyyy
`;

describe("cluster storage technical tests", () => {
  let di: DiContainer;
  let clustersPersistentStorage: PersistentStorage;
  let writeJsonSync: WriteJsonSync;
  let writeFileSync: WriteFileSync;
  let readFileSync: ReadFileSync;
  let getCustomKubeConfigFilePath: GetCustomKubeConfigFilePath;
  let writeFileSyncAndReturnPath: (filePath: string, contents: string) => string;
  let addCluster: AddCluster;
  let getClusterById: GetClusterById;
  let clusters: IComputedValue<Cluster[]>;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-temp-directory");
    di.override(kubectlBinaryNameInjectable, () => "kubectl");
    di.override(kubectlDownloadingNormalizedArchInjectable, () => "amd64");
    di.override(normalizedPlatformInjectable, () => "darwin");
    writeJsonSync = di.inject(writeJsonSyncInjectable);
    writeFileSync = di.inject(writeFileSyncInjectable);
    readFileSync = di.inject(readFileSyncInjectable);
    addCluster = di.inject(addClusterInjectable);
    getClusterById = di.inject(getClusterByIdInjectable);
    clusters = di.inject(clustersInjectable);
    writeFileSyncAndReturnPath = (filePath, contents) => (writeFileSync(filePath, contents), filePath);
  });

  describe("empty config", () => {
    beforeEach(async () => {
      getCustomKubeConfigFilePath = di.inject(getCustomKubeConfigFilePathInjectable);

      writeJsonSync("/some-directory-for-user-data/lens-cluster-store.json", {});
      clustersPersistentStorage = di.inject(clustersPersistentStorageInjectable);
      clustersPersistentStorage.loadAndStartSyncing();
    });

    describe("with foo cluster added", () => {
      beforeEach(() => {
        addCluster({
          id: "foo",
          contextName: "foo",
          preferences: {
            terminalCWD: "/some-directory-for-user-data",
            icon: "data:image/jpeg;base64, iVBORw0KGgoAAAANSUhEUgAAA1wAAAKoCAYAAABjkf5",
            clusterName: "minikube",
          },
          kubeConfigPath: writeFileSyncAndReturnPath(getCustomKubeConfigFilePath("foo"), kubeconfig),
        });
      });

      it("adds new cluster to store", async () => {
        const storedCluster = getClusterById("foo");

        assert(storedCluster);

        expect(storedCluster.id).toBe("foo");
        expect(storedCluster.preferences.terminalCWD).toBe("/some-directory-for-user-data");
        expect(storedCluster.preferences.icon).toBe(
          "data:image/jpeg;base64, iVBORw0KGgoAAAANSUhEUgAAA1wAAAKoCAYAAABjkf5",
        );
      });
    });

    describe("with prod and dev clusters added", () => {
      beforeEach(() => {
        addCluster({
          id: "prod",
          contextName: "foo",
          preferences: {
            clusterName: "prod",
          },
          kubeConfigPath: writeFileSyncAndReturnPath(getCustomKubeConfigFilePath("prod"), kubeconfig),
        });
        addCluster({
          id: "dev",
          contextName: "foo2",
          preferences: {
            clusterName: "dev",
          },
          kubeConfigPath: writeFileSyncAndReturnPath(getCustomKubeConfigFilePath("dev"), kubeconfig),
        });
      });

      it("check if store can contain multiple clusters", () => {
        expect(clusters.get().length).toBe(2);
      });

      it("check if cluster's kubeconfig file saved", () => {
        const file = writeFileSyncAndReturnPath(getCustomKubeConfigFilePath("boo"), "kubeconfig");

        expect(readFileSync(file)).toBe("kubeconfig");
      });
    });
  });

  describe("config with existing clusters", () => {
    beforeEach(() => {
      writeFileSync("/temp-kube-config", kubeconfig);
      writeJsonSync("/some-directory-for-user-data/lens-cluster-store.json", {
        __internal__: {
          migrations: {
            version: "99.99.99",
          },
        },
        clusters: [
          {
            id: "cluster1",
            kubeConfigPath: "/temp-kube-config",
            contextName: "foo",
            preferences: { terminalCWD: "/foo" },
            workspace: "default",
          },
          {
            id: "cluster2",
            kubeConfigPath: "/temp-kube-config",
            contextName: "foo2",
            preferences: { terminalCWD: "/foo2" },
          },
          {
            id: "cluster3",
            kubeConfigPath: "/temp-kube-config",
            contextName: "foo",
            preferences: { terminalCWD: "/foo" },
            workspace: "foo",
            ownerRef: "foo",
          },
        ],
      });

      getCustomKubeConfigFilePath = di.inject(getCustomKubeConfigFilePathInjectable);

      clustersPersistentStorage = di.inject(clustersPersistentStorageInjectable);
      clustersPersistentStorage.loadAndStartSyncing();
    });
    it("allows to retrieve a cluster", () => {
      const storedCluster = getClusterById("cluster1");

      assert(storedCluster);

      expect(storedCluster.id).toBe("cluster1");
      expect(storedCluster.preferences.terminalCWD).toBe("/foo");
    });

    it("allows getting all of the clusters", async () => {
      const storedClusters = clusters.get();

      expect(storedClusters.length).toBe(3);
      expect(storedClusters[0].id).toBe("cluster1");
      expect(storedClusters[0].preferences.terminalCWD).toBe("/foo");
      expect(storedClusters[1].id).toBe("cluster2");
      expect(storedClusters[1].preferences.terminalCWD).toBe("/foo2");
      expect(storedClusters[2].id).toBe("cluster3");
    });
  });
});
