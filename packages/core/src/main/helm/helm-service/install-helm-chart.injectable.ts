/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import helmReleaseCacheInjectable from "../../../features/helm-releases/main/helm-release-cache.injectable";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import installHelmChartInjectable from "../install-helm-chart.injectable";

import type { JsonObject } from "type-fest";

import type { Cluster } from "../../../common/cluster/cluster";

export interface InstallChartArgs {
  chart: string;
  values: JsonObject;
  name: string;
  namespace: string;
  version: string;
  forceConflicts?: boolean;
}

const installClusterHelmChartInjectable = getInjectable({
  id: "install-cluster-helm-chart",

  instantiate: (di) => {
    const installHelmChart = di.inject(installHelmChartInjectable);
    const helmReleaseCache = di.inject(helmReleaseCacheInjectable);

    return async (cluster: Cluster, data: InstallChartArgs) => {
      const proxyKubeconfigManager = di.inject(kubeconfigManagerInjectable, cluster);
      const proxyKubeconfigPath = await proxyKubeconfigManager.ensurePath();

      const result = await installHelmChart({
        ...data,
        kubeconfigPath: proxyKubeconfigPath,
      });

      helmReleaseCache.invalidateCluster(cluster.id);

      return result;
    };
  },
});

export default installClusterHelmChartInjectable;
