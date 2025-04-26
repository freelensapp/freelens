/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import type { Cluster } from "../../../common/cluster/cluster";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import type { GetHelmReleaseValuesData } from "../get-helm-release-values.injectable";
import getHelmReleaseValuesInjectable from "../get-helm-release-values.injectable";

const getClusterHelmReleaseValuesInjectable = getInjectable({
  id: "get-cluster-helm-release-values",

  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);
    const getHelmReleaseValues = di.inject(getHelmReleaseValuesInjectable);

    return async (cluster: Cluster, data: GetHelmReleaseValuesData) => {
      const proxyKubeconfigManager = di.inject(kubeconfigManagerInjectable, cluster);
      const proxyKubeconfigPath = await proxyKubeconfigManager.ensurePath();

      logger.debug(`[CLUSTER]: getting helm release values`, data);

      return getHelmReleaseValues(proxyKubeconfigPath, data);
    };
  },
});

export default getClusterHelmReleaseValuesInjectable;
