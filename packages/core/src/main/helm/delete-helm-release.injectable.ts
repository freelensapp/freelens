/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import execHelmInjectable, { proxyKubeconfigHelmOptions } from "./exec-helm/exec-helm.injectable";

import type { ProxyKubeconfigPaths } from "../kubeconfig-manager/kubeconfig-manager";

export interface DeleteHelmReleaseData {
  name: string;
  namespace: string;
}

export type DeleteHelmRelease = (kubeconfig: ProxyKubeconfigPaths, data: DeleteHelmReleaseData) => Promise<string>;

const deleteHelmReleaseInjectable = getInjectable({
  id: "delete-helm-release",
  instantiate: (di): DeleteHelmRelease => {
    const execHelm = di.inject(execHelmInjectable);

    return async (kubeconfig, { name, namespace }) => {
      const result = await execHelm(
        ["delete", name, "--namespace", namespace, "--kubeconfig", kubeconfig.kubeconfigPath],
        proxyKubeconfigHelmOptions(kubeconfig),
      );

      if (result.callWasSuccessful) {
        return result.response;
      }

      throw result.error;
    };
  },
});

export default deleteHelmReleaseInjectable;
