import type { AsyncResult } from "@freelensapp/utilities";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { HelmRelease } from "../../../../../common/k8s-api/endpoints/helm-releases.api";
import type {
  GetHelmReleaseArgs,
  HelmReleaseDataWithResources,
} from "../../../../../features/helm-releases/common/channels";
import requestListHelmReleasesInjectable from "../../../../../features/helm-releases/renderer/request-list-helm-releases.injectable";
import requestHelmReleaseInjectable from "../../../../../features/helm-releases/renderer/request–helm-release.injectable";
import { toHelmRelease } from "../../to-helm-release";

export interface DetailedHelmRelease {
  release: HelmRelease;
  details: HelmReleaseDataWithResources;
}

export type RequestDetailedHelmRelease = (args: GetHelmReleaseArgs) => AsyncResult<DetailedHelmRelease>;

const requestDetailedHelmReleaseInjectable = getInjectable({
  id: "request-detailed-helm-release",

  instantiate: (di): RequestDetailedHelmRelease => {
    const requestListHelmReleases = di.inject(requestListHelmReleasesInjectable);
    const requestHelmRelease = di.inject(requestHelmReleaseInjectable);

    return async ({ clusterId, namespace, releaseName }) => {
      const listReleasesResult = await requestListHelmReleases({ clusterId, namespace });
      const detailsResult = await requestHelmRelease({ clusterId, releaseName, namespace });

      if (!listReleasesResult.callWasSuccessful) {
        return listReleasesResult;
      }

      const release = listReleasesResult.response.find(
        (rel) => rel.name === releaseName && rel.namespace === namespace,
      );

      if (!release) {
        return {
          callWasSuccessful: false,
          error: `Release ${releaseName} didn't exist in ${namespace} namespace.`,
        };
      }

      if (!detailsResult.callWasSuccessful) {
        return detailsResult;
      }

      return {
        callWasSuccessful: true,
        response: {
          release: toHelmRelease(release),
          details: detailsResult.response,
        },
      };
    };
  },
});

export default requestDetailedHelmReleaseInjectable;
