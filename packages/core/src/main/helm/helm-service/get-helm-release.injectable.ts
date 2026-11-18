/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import * as yaml from "js-yaml";
import requestStoredHelmReleasesInjectable from "../request-stored-helm-releases.injectable";

import type { KubeJsonApiData, KubeJsonApiDataList } from "@freelensapp/kube-object";
import type { AsyncResult } from "@freelensapp/utilities";

import type { Cluster } from "../../../common/cluster/cluster";
import type { HelmReleaseDataWithResources } from "../../../features/helm-releases/common/channels";

export interface GetHelmReleaseArgs {
  cluster: Cluster;
  releaseName: string;
  namespace: string;
}

export type GetHelmRelease = (args: GetHelmReleaseArgs) => AsyncResult<HelmReleaseDataWithResources, string>;

const getHelmReleaseInjectable = getInjectable({
  id: "get-helm-release",

  instantiate: (di): GetHelmRelease => {
    const requestStoredHelmReleases = di.inject(requestStoredHelmReleasesInjectable);

    return async ({ cluster, namespace, releaseName }) => {
      try {
        const [release] = await requestStoredHelmReleases(cluster, namespace, releaseName);

        if (!release) {
          return {
            callWasSuccessful: false,
            error: `Failed to get helm release data: release ${releaseName} not found in ${namespace}`,
          };
        }

        const { name, info, config, manifest, version } = release;
        const resources = (
          yaml.loadAll(manifest).filter(isObject) as unknown as (KubeJsonApiData | KubeJsonApiDataList)[]
        ).flatMap((item) =>
          Array.isArray(item.items) ? (item as KubeJsonApiDataList).items : (item as KubeJsonApiData),
        );

        return {
          callWasSuccessful: true,
          response: { name, namespace: release.namespace, info, config: config ?? {}, manifest, version, resources },
        };
      } catch (error) {
        return {
          callWasSuccessful: false,
          error: `Failed to get helm release data: ${error}`,
        };
      }
    };
  },

  causesSideEffects: true,
});

export default getHelmReleaseInjectable;
