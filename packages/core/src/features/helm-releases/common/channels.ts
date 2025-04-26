/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeJsonApiData } from "@freelensapp/kube-object";
import { getRequestChannel } from "@freelensapp/messaging";
import type { Result } from "@freelensapp/utilities";

export interface GetHelmReleaseArgs {
  clusterId: string;
  releaseName: string;
  namespace: string;
}

export interface HelmReleaseInfo {
  first_deployed: string;
  last_deployed: string;
  deleted: string;
  description: string;
  status: string;
  notes: string;
}

export interface HelmReleaseDataWithResources extends HelmReleaseData {
  resources: KubeJsonApiData[];
}

export interface HelmReleaseData {
  name: string;
  info: HelmReleaseInfo;
  config: Record<string, unknown>;
  manifest: string;
  version: number;
  namespace: string;
}

export type GetHelmReleaseResponse = Result<HelmReleaseDataWithResources, string>;

export const getHelmReleaseChannel = getRequestChannel<GetHelmReleaseArgs, GetHelmReleaseResponse>("get-helm-release");

export interface ListedHelmRelease {
  name: string;
  namespace: string;
  revision: string;
  updated: string;
  status: string;
  chart: string;
  app_version: string;
}

export interface ListHelmReleasesArgs {
  namespace?: string;
  clusterId: string;
}

export type ListHelmReleasesResponse = Result<ListedHelmRelease[], string>;

export const listHelmReleasesChannel = getRequestChannel<ListHelmReleasesArgs, ListHelmReleasesResponse>(
  "list-helm-releases",
);
