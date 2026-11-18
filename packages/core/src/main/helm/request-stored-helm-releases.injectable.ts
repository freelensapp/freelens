/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import k8sRequestInjectable from "../k8s-request.injectable";

import type { HelmReleaseInfo } from "../../features/helm-releases/common/channels";
import type { ClusterData } from "../k8s-request.injectable";

const gunzipAsync = promisify(gunzip);

/**
 * The release as Helm stores it in a `sh.helm.release.v1.<name>.v<revision>` Secret or ConfigMap.
 * Only the fields Freelens reads are declared.
 */
export interface StoredHelmRelease {
  name: string;
  namespace: string;
  version: number;
  info: HelmReleaseInfo;
  config?: Record<string, unknown> | null;
  manifest: string;
  chart: {
    metadata: { name: string; version: string; appVersion?: string };
    values?: Record<string, unknown> | null;
  };
}

interface StoredReleaseObject {
  metadata?: { name?: string; namespace?: string };
  data?: { release?: string };
}

interface StoredReleaseObjectList {
  metadata?: { continue?: string };
  items: StoredReleaseObject[];
}

// Objects per request: each request stays well under the timeout of k8sRequest
// on a slow connection, also for charts that store several hundred KiB per
// revision, where one request for all of them could time out.
const pageSize = 50;

// The order of `helm ls`, which compares the names as Go strings, byte by byte;
// the same name in two namespaces is then ordered by namespace.
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byName = (a: StoredHelmRelease, b: StoredHelmRelease) =>
  compare(a.name, b.name) || compare(a.namespace, b.namespace);

/**
 * Returns the latest revision of each Helm release, read from the release Secrets and ConfigMaps
 * (Helm's `secret` and `configmap` storage drivers) without running helm.
 * Superseded revisions are filtered out by the API server, so only a fraction of the objects is downloaded.
 */
export type RequestStoredHelmReleases = (
  cluster: ClusterData,
  namespace?: string,
  name?: string,
) => Promise<StoredHelmRelease[]>;

// Helm's own encoding: base64 of the gzipped JSON.
const decodeRelease = async (data: string): Promise<StoredHelmRelease> => {
  const encoded = Buffer.from(data, "base64");
  const isGzip = encoded[0] === 0x1f && encoded[1] === 0x8b;

  return JSON.parse((isGzip ? await gunzipAsync(encoded) : encoded).toString());
};

const requestStoredHelmReleasesInjectable = getInjectable({
  id: "request-stored-helm-releases",

  instantiate: (di): RequestStoredHelmReleases => {
    const k8sRequest = di.inject(k8sRequestInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (cluster, namespace, name) => {
      const labelSelector = ["owner=helm", "status!=superseded", ...(name ? [`name=${name}`] : [])].join(",");
      const request = async (resource: "secrets" | "configmaps") => {
        const path = namespace
          ? `/api/v1/namespaces/${encodeURIComponent(namespace)}/${resource}`
          : `/api/v1/${resource}`;
        const items: StoredReleaseObject[] = [];
        let continueToken: string | undefined;

        do {
          const query = new URLSearchParams({ labelSelector, limit: String(pageSize) });

          if (continueToken) {
            query.set("continue", continueToken);
          }

          const page = (await k8sRequest(cluster, `${path}?${query}`)) as StoredReleaseObjectList;

          items.push(...page.items);
          continueToken = page.metadata?.continue || undefined;
        } while (continueToken);

        return items;
      };
      const [secrets, configMaps] = await Promise.all([
        request("secrets"),
        // The configmap driver is rare, so a failure to read ConfigMaps, such
        // as a 403, must not hide the releases stored in Secrets.
        request("configmaps").catch((error) => {
          logger.warn(`[HELM]: cannot read the releases stored in ConfigMaps of clusterId=${cluster.id}`, {
            namespace,
            error,
          });

          return [];
        }),
      ]);
      const stored = [
        // A Secret base64-encodes its data once more.
        ...secrets.map((object) => ({
          object,
          data: object.data?.release && Buffer.from(object.data.release, "base64").toString(),
        })),
        ...configMaps.map((object) => ({ object, data: object.data?.release })),
      ];
      const latest = new Map<string, StoredHelmRelease>();

      for (const { object, data } of stored) {
        if (!data) {
          continue;
        }

        let release: StoredHelmRelease;

        // As helm does, a release object that cannot be decoded is skipped
        // rather than failing the whole list.
        try {
          release = await decodeRelease(data);
        } catch (error) {
          logger.warn(
            `[HELM]: skipping release object ${object.metadata?.namespace}/${object.metadata?.name} that cannot be decoded`,
            { error },
          );
          continue;
        }

        const key = `${release.namespace}/${release.name}`;

        // A failed upgrade leaves the previous revision deployed: keep the latest one, as `helm ls` does.
        if ((latest.get(key)?.version ?? -1) < release.version) {
          latest.set(key, release);
        }
      }

      return [...latest.values()].sort(byName);
    };
  },
});

export default requestStoredHelmReleasesInjectable;
