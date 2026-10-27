/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import loadConfigFromFileInjectable from "../../common/kube-helpers/load-config-from-file.injectable";
import freelensProxyTokenInjectable from "../freelens-proxy/freelens-proxy-token.injectable";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";

import type { KubeConfig } from "@kubernetes/client-node";

import type { Cluster } from "../../common/cluster/cluster";

export type LoadProxyKubeconfig = () => Promise<KubeConfig>;

const loadProxyKubeconfigInjectable = getInjectable({
  id: "load-proxy-kubeconfig",
  instantiate: (di, cluster) => {
    const loadConfigFromFile = di.inject(loadConfigFromFileInjectable);
    const proxyKubeconfigManager = di.inject(kubeconfigManagerInjectable, cluster);
    const token = di.inject(freelensProxyTokenInjectable);

    return async () => {
      const proxyKubeconfigPath = await proxyKubeconfigManager.ensurePath();
      const { config } = await loadConfigFromFile(proxyKubeconfigPath);

      // The proxy kubeconfig names the `credential` plugin, which an in-process
      // client would run as a child process with the token from the
      // environment. Here the token is given straight from memory instead, so
      // nothing is spawned and it reaches neither a child's environment nor the
      // file. undici sends it as `Authorization: Bearer` to freelens-proxy.
      config.users = config.users.map((user) => (user.exec ? { ...user, exec: undefined, token: token.value } : user));

      return config;
    };
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default loadProxyKubeconfigInjectable;
