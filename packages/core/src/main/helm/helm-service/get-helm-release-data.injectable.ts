/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject, json } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import execHelmInjectable, { proxyKubeconfigHelmOptions } from "../exec-helm/exec-helm.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { HelmReleaseData } from "../../../features/helm-releases/common/channels";
import type { ProxyKubeconfigPaths } from "../../kubeconfig-manager/kubeconfig-manager";

export type GetHelmReleaseData = (
  name: string,
  namespace: string,
  kubeconfig: ProxyKubeconfigPaths,
) => AsyncResult<HelmReleaseData, string>;

const getHelmReleaseDataInjectable = getInjectable({
  id: "get-helm-release-data",
  instantiate: (di): GetHelmReleaseData => {
    const execHelm = di.inject(execHelmInjectable);

    return async (releaseName, namespace, kubeconfig) => {
      const result = await execHelm(
        [
          "status",
          releaseName,
          "--namespace",
          namespace,
          "--kubeconfig",
          kubeconfig.kubeconfigPath,
          "--output",
          "json",
        ],
        proxyKubeconfigHelmOptions(kubeconfig),
      );

      if (!result.callWasSuccessful) {
        return {
          callWasSuccessful: false,
          error: `Failed to execute helm: ${result.error}`,
        };
      }

      const parseResult = json.parse(result.response);

      if (!parseResult.callWasSuccessful) {
        return {
          callWasSuccessful: false,
          error: `Failed to parse helm response: ${parseResult.error}`,
        };
      }

      const release = parseResult.response;

      if (!isObject(release) || Array.isArray(release)) {
        return {
          callWasSuccessful: false,
          error: `Helm response is not an object: ${JSON.stringify(release)}`,
        };
      }

      return {
        callWasSuccessful: true,
        response: release as unknown as HelmReleaseData,
      };
    };
  },
});

export default getHelmReleaseDataInjectable;
