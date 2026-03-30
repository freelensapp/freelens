/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import removePathInjectable from "../../../common/fs/remove.injectable";
import writeFileInjectable from "../../../common/fs/write-file.injectable";
import helmReleaseCacheInjectable from "../../../features/helm-releases/main/helm-release-cache.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import deleteHelmReleaseInjectable, { type DeleteHelmReleaseData } from "../delete-helm-release.injectable";
import execHelmInjectable from "../exec-helm/exec-helm.injectable";
import installHelmChartInjectable from "../install-helm-chart.injectable";
import rollbackHelmReleaseInjectable from "../rollback-helm-release.injectable";
import deleteClusterHelmReleaseInjectable from "./delete-helm-release.injectable";
import getHelmReleaseInjectable from "./get-helm-release.injectable";
import installClusterHelmChartInjectable, { type InstallChartArgs } from "./install-helm-chart.injectable";
import rollbackClusterHelmReleaseInjectable from "./rollback-helm-release.injectable";
import updateHelmReleaseInjectable, { type UpdateChartArgs } from "./update-helm-release.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { Cluster } from "../../../common/cluster/cluster";
import type { RemovePath } from "../../../common/fs/remove.injectable";
import type { WriteFile } from "../../../common/fs/write-file.injectable";
import type { HelmReleaseDataWithResources } from "../../../features/helm-releases/common/channels";
import type { HelmReleaseCache } from "../../../features/helm-releases/main/helm-release-cache.injectable";
import type { KubeconfigManager } from "../../kubeconfig-manager/kubeconfig-manager";
import type { DeleteHelmRelease } from "../delete-helm-release.injectable";
import type { ExecHelm } from "../exec-helm/exec-helm.injectable";
import type { InstallHelmChart } from "../install-helm-chart.injectable";
import type { RollbackHelmRelease, RollbackHelmReleaseData } from "../rollback-helm-release.injectable";
import type { GetHelmRelease } from "./get-helm-release.injectable";

describe("cache invalidation on helm write operations", () => {
  let cluster: Cluster;

  beforeEach(() => {
    cluster = {
      id: "some-cluster-id",
    } as Cluster;
  });

  it("invalidates cluster cache after deleting release", async () => {
    const di = getDiForUnitTesting();
    const helmReleaseCacheMock = getHelmReleaseCacheMock();
    const deleteHelmReleaseMock: jest.MockedFunction<DeleteHelmRelease> = jest.fn().mockResolvedValue("deleted");

    setupKubeconfigManager(di);
    di.override(helmReleaseCacheInjectable, () => helmReleaseCacheMock);
    di.override(deleteHelmReleaseInjectable, () => deleteHelmReleaseMock);
    di.permitSideEffects(helmReleaseCacheInjectable);
    di.permitSideEffects(deleteClusterHelmReleaseInjectable);

    const deleteClusterHelmRelease = di.inject(deleteClusterHelmReleaseInjectable);
    const payload: DeleteHelmReleaseData = {
      name: "some-release",
      namespace: "default",
    };

    await deleteClusterHelmRelease(cluster, payload);

    expect(helmReleaseCacheMock.invalidateCluster).toHaveBeenCalledWith(cluster.id);
  });

  it("invalidates cluster cache after installing chart", async () => {
    const di = getDiForUnitTesting();
    const helmReleaseCacheMock = getHelmReleaseCacheMock();
    const installHelmChartMock: jest.MockedFunction<InstallHelmChart> = jest.fn().mockResolvedValue({
      log: "installed",
      release: {
        name: "some-release",
        namespace: "default",
      },
    });

    setupKubeconfigManager(di);
    di.override(helmReleaseCacheInjectable, () => helmReleaseCacheMock);
    di.override(installHelmChartInjectable, () => installHelmChartMock);
    di.permitSideEffects(helmReleaseCacheInjectable);
    di.permitSideEffects(installClusterHelmChartInjectable);

    const installClusterHelmChart = di.inject(installClusterHelmChartInjectable);
    const payload: InstallChartArgs = {
      chart: "some-chart",
      values: {},
      name: "some-release",
      namespace: "default",
      version: "1.0.0",
      forceConflicts: false,
    };

    await installClusterHelmChart(cluster, payload);

    expect(helmReleaseCacheMock.invalidateCluster).toHaveBeenCalledWith(cluster.id);
  });

  it("invalidates cluster cache after rolling back release", async () => {
    const di = getDiForUnitTesting();
    const helmReleaseCacheMock = getHelmReleaseCacheMock();
    const rollbackHelmReleaseMock: jest.MockedFunction<RollbackHelmRelease> = jest.fn().mockResolvedValue(undefined);

    setupKubeconfigManager(di);
    di.override(helmReleaseCacheInjectable, () => helmReleaseCacheMock);
    di.override(rollbackHelmReleaseInjectable, () => rollbackHelmReleaseMock);
    di.permitSideEffects(helmReleaseCacheInjectable);
    di.permitSideEffects(rollbackClusterHelmReleaseInjectable);

    const rollbackClusterHelmRelease = di.inject(rollbackClusterHelmReleaseInjectable);
    const payload: RollbackHelmReleaseData = {
      name: "some-release",
      namespace: "default",
      revision: 1,
    };

    await rollbackClusterHelmRelease(cluster, payload);

    expect(helmReleaseCacheMock.invalidateCluster).toHaveBeenCalledWith(cluster.id);
  });

  it("invalidates cluster cache after updating release", async () => {
    const di = getDiForUnitTesting();
    const helmReleaseCacheMock = getHelmReleaseCacheMock();
    const execHelmMock: jest.MockedFunction<ExecHelm> = jest.fn().mockResolvedValue({
      callWasSuccessful: true,
      response: "upgraded",
    });
    const getHelmReleaseMock: jest.MockedFunction<GetHelmRelease> = jest.fn().mockResolvedValue({
      callWasSuccessful: true,
      response: getHelmReleaseResponse(),
    });
    const writeFileMock: jest.MockedFunction<WriteFile> = jest.fn().mockResolvedValue(undefined);
    const removePathMock: jest.MockedFunction<RemovePath> = jest.fn().mockResolvedValue(undefined);

    setupKubeconfigManager(di);
    di.unoverride(updateHelmReleaseInjectable);
    di.unoverride(getHelmReleaseInjectable);
    di.override(helmReleaseCacheInjectable, () => helmReleaseCacheMock);
    di.override(execHelmInjectable, () => execHelmMock);
    di.override(getHelmReleaseInjectable, () => getHelmReleaseMock);
    di.override(writeFileInjectable, () => writeFileMock);
    di.override(removePathInjectable, () => removePathMock);
    di.permitSideEffects(helmReleaseCacheInjectable);
    di.permitSideEffects(getHelmReleaseInjectable);
    di.permitSideEffects(updateHelmReleaseInjectable);

    const updateHelmRelease = di.inject(updateHelmReleaseInjectable);
    const payload: UpdateChartArgs = {
      chart: "some-chart",
      values: "some-values",
      version: "1.0.0",
      forceConflicts: false,
    };

    await updateHelmRelease(cluster, "some-release", "default", payload);

    expect(helmReleaseCacheMock.invalidateCluster).toHaveBeenCalledWith(cluster.id);
  });
});

const getHelmReleaseCacheMock = (): HelmReleaseCache => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateCluster: jest.fn(),
  clear: jest.fn(),
});

const setupKubeconfigManager = (di: DiContainer) => {
  di.override(
    kubeconfigManagerInjectable,
    () =>
      ({
        ensurePath: async () => "/some-kubeconfig-path",
      }) as Partial<KubeconfigManager> as KubeconfigManager,
  );
};

const getHelmReleaseResponse = (): HelmReleaseDataWithResources => ({
  name: "some-release",
  namespace: "default",
  version: 1,
  config: {},
  manifest: "some-manifest",
  resources: [],
  info: {
    deleted: "",
    description: "",
    first_deployed: "",
    last_deployed: "",
    notes: "",
    status: "deployed",
  },
});
