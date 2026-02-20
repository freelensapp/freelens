/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestHelmReleaseInjectable from "../../../../../features/helm-releases/renderer/request-helm-release.injectable";
import releasesInjectable from "../../releases.injectable";
import { toHelmReleaseFromData } from "../../to-helm-release";

import type { AsyncResult } from "@freelensapp/utilities";

import type { HelmRelease } from "../../../../../common/k8s-api/endpoints/helm-releases.api";
import type {
  GetHelmReleaseArgs,
  HelmReleaseDataWithResources,
} from "../../../../../features/helm-releases/common/channels";

export interface DetailedHelmRelease {
  release: HelmRelease;
  details: HelmReleaseDataWithResources;
}

export type RequestDetailedHelmRelease = (args: GetHelmReleaseArgs) => AsyncResult<DetailedHelmRelease>;

const requestDetailedHelmReleaseInjectable = getInjectable({
  id: "request-detailed-helm-release",

  instantiate: (di): RequestDetailedHelmRelease => {
    const requestHelmRelease = di.inject(requestHelmReleaseInjectable);
    const releases = di.inject(releasesInjectable);

    return async ({ clusterId, namespace, releaseName }) => {
      const detailsResult = await requestHelmRelease({ clusterId, releaseName, namespace });

      if (!detailsResult.callWasSuccessful) {
        return detailsResult;
      }

      const loadedReleases = releases.value.get();
      const release = loadedReleases.find((rel) => rel.getName() === releaseName && rel.getNs() === namespace);

      return {
        callWasSuccessful: true,
        response: {
          release: release ?? toHelmReleaseFromData(detailsResult.response),
          details: detailsResult.response,
        },
      };
    };
  },
});

export default requestDetailedHelmReleaseInjectable;
