/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import execHelmInjectable, { proxyKubeconfigHelmOptions } from "./exec-helm/exec-helm.injectable";

import type { HelmReleaseRevision } from "../../common/k8s-api/endpoints/helm-releases.api/request-history.injectable";
import type { ProxyKubeconfigPaths } from "../kubeconfig-manager/kubeconfig-manager";

export interface GetHelmReleaseHistoryData {
  name: string;
  namespace: string;
}

export type GetHelmReleaseHistory = (
  kubeconfig: ProxyKubeconfigPaths,
  data: GetHelmReleaseHistoryData,
) => Promise<HelmReleaseRevision[]>;

const getHelmReleaseHistoryInjectable = getInjectable({
  id: "get-helm-release-history",
  instantiate: (di): GetHelmReleaseHistory => {
    const execHelm = di.inject(execHelmInjectable);

    return async (kubeconfig, { name, namespace }) => {
      const result = await execHelm(
        ["history", name, "--output", "json", "--namespace", namespace, "--kubeconfig", kubeconfig.kubeconfigPath],
        proxyKubeconfigHelmOptions(kubeconfig),
      );

      if (result.callWasSuccessful) {
        return JSON.parse(result.response);
      }

      throw result.error;
    };
  },
});

export default getHelmReleaseHistoryInjectable;
