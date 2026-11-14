/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { promisify } from "node:util";
import { gunzip } from "node:zlib";
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

interface ReleaseList {
  items: { data?: { release?: string } }[];
}

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

    return async (cluster, namespace, name) => {
      const labelSelector = ["owner=helm", "status!=superseded", ...(name ? [`name=${name}`] : [])].join(",");
      const request = async (resource: "secrets" | "configmaps") => {
        const path = namespace
          ? `/api/v1/namespaces/${encodeURIComponent(namespace)}/${resource}`
          : `/api/v1/${resource}`;

        return (
          (await k8sRequest(cluster, `${path}?labelSelector=${encodeURIComponent(labelSelector)}`)) as ReleaseList
        ).items;
      };
      const [secrets, configMaps] = await Promise.all([
        request("secrets"),
        // ponytail: the configmap driver is rare, so failing to read ConfigMaps (e.g. RBAC) must not hide the Secrets.
        request("configmaps").catch(() => []),
      ]);
      const encoded = [
        // A Secret base64-encodes its data once more.
        ...secrets.map(({ data }) => data?.release && Buffer.from(data.release, "base64").toString()),
        ...configMaps.map(({ data }) => data?.release),
      ];
      const latest = new Map<string, StoredHelmRelease>();

      for (const data of encoded) {
        if (!data) {
          continue;
        }

        const release = await decodeRelease(data);
        const key = `${release.namespace}/${release.name}`;

        // A failed upgrade leaves the previous revision deployed: keep the latest one, as `helm ls` does.
        if ((latest.get(key)?.version ?? -1) < release.version) {
          latest.set(key, release);
        }
      }

      return [...latest.values()];
    };
  },
});

export default requestStoredHelmReleasesInjectable;
