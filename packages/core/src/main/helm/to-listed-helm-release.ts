/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ListedHelmRelease } from "../../features/helm-releases/common/channels";
import type { StoredHelmRelease } from "./request-stored-helm-releases.injectable";

// The row of `helm ls -o json` for a release.
export const toListedHelmRelease = ({
  name,
  namespace,
  version,
  info,
  chart,
}: StoredHelmRelease): ListedHelmRelease => ({
  name,
  namespace,
  revision: String(version),
  updated: info.last_deployed,
  status: info.status,
  chart: `${chart.metadata.name}-${chart.metadata.version}`,
  app_version: chart.metadata.appVersion ?? "",
});
