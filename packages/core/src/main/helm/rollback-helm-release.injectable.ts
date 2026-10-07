/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import execHelmInjectable, { proxyKubeconfigHelmOptions } from "./exec-helm/exec-helm.injectable";

import type { ProxyKubeconfigPaths } from "../kubeconfig-manager/kubeconfig-manager";

export interface RollbackHelmReleaseData {
  name: string;
  namespace: string;
  revision: number;
}

export type RollbackHelmRelease = (kubeconfig: ProxyKubeconfigPaths, data: RollbackHelmReleaseData) => Promise<void>;

const rollbackHelmReleaseInjectable = getInjectable({
  id: "rollback-helm-release",
  instantiate: (di): RollbackHelmRelease => {
    const execHelm = di.inject(execHelmInjectable);

    return async (kubeconfig, { name, namespace, revision }) => {
      const result = await execHelm(
        ["rollback", name, `${revision}`, "--namespace", namespace, "--kubeconfig", kubeconfig.kubeconfigPath],
        proxyKubeconfigHelmOptions(kubeconfig),
      );

      if (!result.callWasSuccessful) {
        throw result.error;
      }
    };
  },
});

export default rollbackHelmReleaseInjectable;
