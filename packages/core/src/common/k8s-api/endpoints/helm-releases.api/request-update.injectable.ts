/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { urlBuilderFor } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import apiBaseInjectable from "../../api-base.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

interface HelmReleaseUpdatePayload {
  repo: string;
  chart: string;
  version: string;
  values: string;
}

export type RequestHelmReleaseUpdate = (
  name: string,
  namespace: string,
  payload: HelmReleaseUpdatePayload,
) => AsyncResult<void, unknown>;

const requestUpdateEndpoint = urlBuilderFor("/v2/releases/:namespace/:name");

const requestHelmReleaseUpdateInjectable = getInjectable({
  id: "request-helm-release-update",

  instantiate: (di): RequestHelmReleaseUpdate => {
    const apiBase = di.inject(apiBaseInjectable);

    return async (name, namespace, { repo, chart, values, version }) => {
      try {
        await apiBase.put(requestUpdateEndpoint.compile({ name, namespace }), {
          data: {
            chart: `${repo}/${chart}`,
            values,
            version,
          },
        });
      } catch (e) {
        return { callWasSuccessful: false, error: e };
      }

      return { callWasSuccessful: true };
    };
  },
});

export default requestHelmReleaseUpdateInjectable;
