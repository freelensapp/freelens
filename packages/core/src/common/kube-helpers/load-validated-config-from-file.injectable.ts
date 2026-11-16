/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { loadValidatedConfig } from "../kube-helpers";
import resolveTildeInjectable from "../path/resolve-tilde.injectable";
import readKubeconfigFileInjectable from "./read-kubeconfig-file.injectable";

import type { Cluster } from "../cluster/cluster";
import type { ValidateKubeConfigResult } from "../kube-helpers";

export type LoadValidatedClusterConfig = (cluster: Cluster) => Promise<ValidateKubeConfigResult>;

const loadValidatedClusterConfigInjectable = getInjectable({
  id: "load-validated-cluster-config",
  instantiate: (di): LoadValidatedClusterConfig => {
    const readKubeconfigFile = di.inject(readKubeconfigFileInjectable);
    const resolveTilde = di.inject(resolveTildeInjectable);

    return async (cluster) => {
      const data = await readKubeconfigFile(resolveTilde(cluster.kubeConfigPath.get()));

      return loadValidatedConfig(data, cluster.contextName.get());
    };
  },
});

export default loadValidatedClusterConfigInjectable;
