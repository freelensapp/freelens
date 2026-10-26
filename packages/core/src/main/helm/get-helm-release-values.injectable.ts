/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import execHelmInjectable, { proxyKubeconfigHelmOptions } from "./exec-helm/exec-helm.injectable";

import type { ProxyKubeconfigPaths } from "../kubeconfig-manager/kubeconfig-manager";

export interface GetHelmReleaseValuesData {
  name: string;
  namespace: string;
  all?: boolean;
}

export type GetHelmReleaseValues = (
  kubeconfig: ProxyKubeconfigPaths,
  data: GetHelmReleaseValuesData,
) => Promise<string>;

const getHelmReleaseValuesInjectable = getInjectable({
  id: "get-helm-release-values",
  instantiate: (di): GetHelmReleaseValues => {
    const execHelm = di.inject(execHelmInjectable);

    return async (kubeconfig, { name, namespace, all = false }) => {
      const args = ["get", "values", name];

      if (all) {
        args.push("--all");
      }

      args.push("--output", "yaml", "--namespace", namespace, "--kubeconfig", kubeconfig.kubeconfigPath);

      const result = await execHelm(args, proxyKubeconfigHelmOptions(kubeconfig));

      if (result.callWasSuccessful) {
        return result.response;
      }

      throw result.error;
    };
  },
});

export default getHelmReleaseValuesInjectable;
