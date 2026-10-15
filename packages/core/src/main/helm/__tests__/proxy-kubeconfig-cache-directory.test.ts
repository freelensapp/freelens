/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../../common/cluster/cluster";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import removePathInjectable from "../../../common/fs/remove.injectable";
import writeFileInjectable from "../../../common/fs/write-file.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import deleteHelmReleaseInjectable from "../delete-helm-release.injectable";
import execHelmEnvInjectable from "../exec-helm/exec-env.injectable";
import execHelmInjectable from "../exec-helm/exec-helm.injectable";
import getHelmReleaseHistoryInjectable from "../get-helm-release-history.injectable";
import getHelmReleaseValuesInjectable from "../get-helm-release-values.injectable";
import helmBinaryPathInjectable from "../helm-binary-path.injectable";
import getHelmReleaseInjectable from "../helm-service/get-helm-release.injectable";
import getHelmReleaseDataInjectable from "../helm-service/get-helm-release-data.injectable";
import updateHelmReleaseInjectable from "../helm-service/update-helm-release.injectable";
import installHelmChartInjectable from "../install-helm-chart.injectable";
import listHelmReleasesInjectable from "../list-helm-releases.injectable";
import rollbackHelmReleaseInjectable from "../rollback-helm-release.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { ExecFile } from "../../../common/fs/exec-file.injectable";
import type { KubeconfigManager, ProxyKubeconfigPaths } from "../../kubeconfig-manager/kubeconfig-manager";
import type { ExecHelm } from "../exec-helm/exec-helm.injectable";

const kubeconfig: ProxyKubeconfigPaths = {
  kubeconfigPath: "/some-directory-for-temp/kubeconfig-some-cluster-id",
  cacheDirectoryPath: "/some-directory-for-temp/kubecache-some-cluster-id",
};

describe("helm with the proxy kubeconfig", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  describe("execHelm", () => {
    let execFileMock: Mock;

    beforeEach(() => {
      execFileMock = vi.fn(async () => ({ callWasSuccessful: true, response: "" }));

      di.override(execFileInjectable, () => execFileMock as unknown as ExecFile);
      di.override(helmBinaryPathInjectable, () => "/some-helm");
      di.override(execHelmEnvInjectable, () =>
        computed(() => ({ HTTPS_PROXY: "http://some-https-proxy:3128", KUBECACHEDIR: "/some-user-cache" })),
      );
    });

    it("runs helm with the cluster-independent environment by default", async () => {
      await di.inject(execHelmInjectable)(["version"]);

      expect(execFileMock).toHaveBeenCalledWith("/some-helm", ["version"], {
        maxBuffer: expect.any(Number),
        env: { HTTPS_PROXY: "http://some-https-proxy:3128", KUBECACHEDIR: "/some-user-cache" },
      });
    });

    it("sets the variables of a call on top of the cluster-independent environment", async () => {
      await di.inject(execHelmInjectable)(["ls"], { env: { KUBECACHEDIR: kubeconfig.cacheDirectoryPath } });

      expect(execFileMock).toHaveBeenCalledWith("/some-helm", ["ls"], {
        maxBuffer: expect.any(Number),
        env: { HTTPS_PROXY: "http://some-https-proxy:3128", KUBECACHEDIR: kubeconfig.cacheDirectoryPath },
      });
    });
  });

  describe("helm calls", () => {
    let execHelmMock: Mock<ExecHelm>;

    beforeEach(() => {
      execHelmMock = vi.fn<ExecHelm>(async () => ({ callWasSuccessful: true, response: "[]" }));

      di.override(execHelmInjectable, () => execHelmMock);
      di.override(writeFileInjectable, () => vi.fn(async () => {}));
      di.override(removePathInjectable, () => vi.fn(async () => {}));
    });

    const expectKubeCacheDir = () => {
      expect(execHelmMock).toHaveBeenCalledExactlyOnceWith(
        expect.arrayContaining(["--kubeconfig", kubeconfig.kubeconfigPath]),
        { env: { KUBECACHEDIR: kubeconfig.cacheDirectoryPath } },
      );
    };

    it("lists releases with KUBECACHEDIR", async () => {
      await di.inject(listHelmReleasesInjectable)(kubeconfig, "some-namespace");

      expectKubeCacheDir();
    });

    it("gets release data with KUBECACHEDIR", async () => {
      execHelmMock.mockResolvedValue({ callWasSuccessful: true, response: "{}" });

      await di.inject(getHelmReleaseDataInjectable)("some-release", "some-namespace", kubeconfig);

      expectKubeCacheDir();
    });

    it("gets release values with KUBECACHEDIR", async () => {
      await di.inject(getHelmReleaseValuesInjectable)(kubeconfig, {
        name: "some-release",
        namespace: "some-namespace",
      });

      expectKubeCacheDir();
    });

    it("gets release history with KUBECACHEDIR", async () => {
      await di.inject(getHelmReleaseHistoryInjectable)(kubeconfig, {
        name: "some-release",
        namespace: "some-namespace",
      });

      expectKubeCacheDir();
    });

    it("rolls back a release with KUBECACHEDIR", async () => {
      await di.inject(rollbackHelmReleaseInjectable)(kubeconfig, {
        name: "some-release",
        namespace: "some-namespace",
        revision: 1,
      });

      expectKubeCacheDir();
    });

    it("deletes a release with KUBECACHEDIR", async () => {
      await di.inject(deleteHelmReleaseInjectable)(kubeconfig, { name: "some-release", namespace: "some-namespace" });

      expectKubeCacheDir();
    });

    it("installs a chart with KUBECACHEDIR", async () => {
      execHelmMock.mockResolvedValue({ callWasSuccessful: true, response: "NAME: some-release\n" });

      await di.inject(installHelmChartInjectable)({
        chart: "some-repo/some-chart",
        values: "",
        name: "some-release",
        namespace: "some-namespace",
        version: "1.0.0",
        kubeconfig,
      });

      expectKubeCacheDir();
    });

    it("upgrades a release with the paths of the cluster's proxy kubeconfig", async () => {
      const cluster = new Cluster({
        id: "some-cluster-id",
        contextName: "some-context",
        kubeConfigPath: "/some-kubeconfig",
      });

      di.override(
        kubeconfigManagerInjectable,
        () => ({ ensurePaths: async () => kubeconfig }) as Partial<KubeconfigManager> as KubeconfigManager,
      );
      di.unoverride(updateHelmReleaseInjectable);
      di.override(getHelmReleaseInjectable, () => async () => ({
        callWasSuccessful: true,
        response: {} as never,
      }));

      await di.inject(updateHelmReleaseInjectable)(cluster, "some-release", "some-namespace", {
        chart: "some-repo/some-chart",
        values: "",
        version: "1.0.0",
      });

      expectKubeCacheDir();
    });
  });
});
