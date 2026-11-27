/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Node } from "@freelensapp/kube-object";

/**
 * How far a kubelet may lag behind the API server, in minor versions, by the version skew policy
 * of Kubernetes. A kubelet must never be newer than the API server.
 */
export const supportedKubeletMinorLag = 3;

export interface ValueCount {
  value: string;
  count: number;
}

export interface KubeletSkew {
  /** The nodes do not all run the same kubelet version. */
  versionsDiffer: boolean;
  /** Kubelet versions of a later minor than the API server. */
  newerThanApiServer: string[];
  /** Kubelet versions more than {@link supportedKubeletMinorLag} minors behind the API server. */
  olderThanSupported: string[];
}

export interface NodeSummary {
  total: number;
  ready: number;
  controlPlane: number;
  workers: number;
  kubeletVersions: ValueCount[];
  osImages: ValueCount[];
  platforms: ValueCount[];
  containerRuntimes: ValueCount[];
  skew: KubeletSkew;
}

interface MinorVersion {
  major: number;
  minor: number;
}

/**
 * Reads the major and minor of a Kubernetes version such as `v1.31.2`, `v1.30.4+k3s1` or
 * `v1.29.8-eks-a737599`. Anything else, `unknown` included, has none.
 */
export function parseMinorVersion(version: string): MinorVersion | undefined {
  const match = /^v?(\d+)\.(\d+)/.exec(version.trim());

  if (!match) {
    return undefined;
  }

  return { major: Number(match[1]), minor: Number(match[2]) };
}

const minorsBehind = (version: MinorVersion, reference: MinorVersion) =>
  version.major === reference.major
    ? reference.minor - version.minor
    : (reference.major - version.major) * Number.POSITIVE_INFINITY;

export function getKubeletSkew(kubeletVersions: string[], apiServerVersion: string): KubeletSkew {
  const apiServer = parseMinorVersion(apiServerVersion);
  const newerThanApiServer: string[] = [];
  const olderThanSupported: string[] = [];

  if (apiServer) {
    for (const kubeletVersion of kubeletVersions) {
      const kubelet = parseMinorVersion(kubeletVersion);

      if (!kubelet) {
        continue;
      }

      const behind = minorsBehind(kubelet, apiServer);

      if (behind < 0) {
        newerThanApiServer.push(kubeletVersion);
      } else if (behind > supportedKubeletMinorLag) {
        olderThanSupported.push(kubeletVersion);
      }
    }
  }

  return {
    versionsDiffer: new Set(kubeletVersions).size > 1,
    newerThanApiServer,
    olderThanSupported,
  };
}

export const hasKubeletSkew = ({ versionsDiffer, newerThanApiServer, olderThanSupported }: KubeletSkew) =>
  versionsDiffer || newerThanApiServer.length > 0 || olderThanSupported.length > 0;

/**
 * The distinct values, the most common first and equally common ones in natural order. Missing
 * and empty values are left out.
 */
export function countDistinct(values: (string | undefined)[]): ValueCount[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }

  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort(
      (left, right) => right.count - left.count || left.value.localeCompare(right.value, undefined, { numeric: true }),
    );
}

const isReady = (node: Node) =>
  node.status?.conditions?.some(({ type, status }) => type === "Ready" && status === "True") ?? false;

const platformOf = (node: Node) => {
  const { operatingSystem, architecture } = node.status?.nodeInfo ?? {};

  return operatingSystem && architecture ? `${operatingSystem}/${architecture}` : undefined;
};

export function summarizeNodes(nodes: Node[], apiServerVersion: string): NodeSummary {
  const controlPlane = nodes.filter((node) => node.isMasterNode()).length;
  const kubeletVersions = countDistinct(nodes.map((node) => node.status?.nodeInfo?.kubeletVersion));

  return {
    total: nodes.length,
    ready: nodes.filter(isReady).length,
    controlPlane,
    workers: nodes.length - controlPlane,
    kubeletVersions,
    osImages: countDistinct(nodes.map((node) => node.status?.nodeInfo?.osImage)),
    platforms: countDistinct(nodes.map(platformOf)),
    containerRuntimes: countDistinct(nodes.map((node) => node.status?.nodeInfo?.containerRuntimeVersion)),
    skew: getKubeletSkew(
      kubeletVersions.map(({ value }) => value),
      apiServerVersion,
    ),
  };
}

/**
 * The warnings about the kubelet versions, one sentence each.
 */
export function describeKubeletSkew(skew: KubeletSkew, apiServerVersion: string): string[] {
  return [
    ...(skew.versionsDiffer ? ["The nodes run different kubelet versions."] : []),
    ...skew.newerThanApiServer.map(
      (version) => `Kubelet ${version} is newer than the API server (${apiServerVersion}), which is not supported.`,
    ),
    ...skew.olderThanSupported.map(
      (version) =>
        `Kubelet ${version} is more than ${supportedKubeletMinorLag} minor versions older than the API server (${apiServerVersion}), which is not supported.`,
    ),
  ];
}
