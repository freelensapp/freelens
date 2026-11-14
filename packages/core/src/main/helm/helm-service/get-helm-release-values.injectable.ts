/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import * as yaml from "js-yaml";
import requestStoredHelmReleasesInjectable from "../request-stored-helm-releases.injectable";

import type { Cluster } from "../../../common/cluster/cluster";

export interface GetHelmReleaseValuesData {
  name: string;
  namespace: string;
  all?: boolean;
}

type Values = Record<string, unknown>;

const isTable = (value: unknown): value is Values =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Helm's CoalesceValues: the chart defaults fill in what the user did not set, and a user `null` removes a default.
 * The stored chart carries no subcharts, so `helm get values --all` merges only this level too.
 */
export const coalesceValues = (dst: Values, src: Values): Values => {
  for (const [key, value] of Object.entries(src)) {
    if (!(key in dst)) {
      dst[key] = value;
    } else if (dst[key] === null) {
      delete dst[key];
    } else if (isTable(value) && isTable(dst[key])) {
      coalesceValues(dst[key], value);
    }
  }

  return dst;
};

const getClusterHelmReleaseValuesInjectable = getInjectable({
  id: "get-cluster-helm-release-values",

  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);
    const requestStoredHelmReleases = di.inject(requestStoredHelmReleasesInjectable);

    return async (cluster: Cluster, { name, namespace, all = false }: GetHelmReleaseValuesData) => {
      logger.debug(`[CLUSTER]: getting helm release values`, { name, namespace, all });

      const [release] = await requestStoredHelmReleases(cluster, namespace, name);

      if (!release) {
        throw new Error(`release ${name} not found in ${namespace}`);
      }

      const config = structuredClone(release.config ?? {});
      const values = all ? coalesceValues(config, release.chart.values ?? {}) : config;

      return Object.keys(values).length ? yaml.dump(values) : "";
    };
  },
});

export default getClusterHelmReleaseValuesInjectable;
