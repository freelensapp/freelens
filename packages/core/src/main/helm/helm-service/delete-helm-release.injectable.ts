/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import deleteHelmReleaseInjectable from "../delete-helm-release.injectable";

import type { Cluster } from "../../../common/cluster/cluster";
import type { DeleteHelmReleaseData } from "../delete-helm-release.injectable";

const deleteClusterHelmReleaseInjectable = getInjectable({
  id: "delete-cluster-helm-release",

  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);
    const deleteHelmRelease = di.inject(deleteHelmReleaseInjectable);

    return async (cluster: Cluster, data: DeleteHelmReleaseData) => {
      const proxyKubeconfigManager = di.inject(kubeconfigManagerInjectable, cluster);
      const proxyKubeconfigPath = await proxyKubeconfigManager.ensurePath();

      logger.debug(`[CLUSTER]: Delete helm release`, data);

      return deleteHelmRelease(proxyKubeconfigPath, data);
    };
  },
});

export default deleteClusterHelmReleaseInjectable;
