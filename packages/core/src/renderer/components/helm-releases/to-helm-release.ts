/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatDuration } from "@freelensapp/utilities";
import { capitalize } from "lodash";
import { getMillisecondsFromUnixEpoch } from "../../../common/utils/date/get-current-date-time";

import type { HelmRelease } from "../../../common/k8s-api/endpoints/helm-releases.api";
import type { ListedHelmRelease } from "../../../features/helm-releases/common/channels";

export const toHelmRelease = (release: ListedHelmRelease): HelmRelease => ({
  appVersion: release.app_version,
  chart: release.chart,
  namespace: release.namespace,
  revision: release.revision,
  status: release.status,
  name: release.name,
  updated: release.updated,

  getId() {
    return `${this.namespace}/${this.name}`;
  },

  getName() {
    return this.name;
  },

  getNs() {
    return this.namespace;
  },

  getChart(withVersion = false) {
    let chart = this.chart;

    if (!withVersion && this.getVersion() != "") {
      const search = new RegExp(`-${this.getVersion()}`);

      chart = chart.replace(search, "");
    }

    return chart;
  },

  getRevision() {
    return parseInt(this.revision, 10);
  },

  getStatus() {
    return capitalize(this.status);
  },

  getVersion() {
    const versions = this.chart.match(/(?<=-)(v?\d+)[^-].*$/);

    return versions?.[0] ?? "";
  },

  getUpdated(humanize = true, compact = true) {
    const updated = this.updated.replace(/\s\w*$/, ""); // 2019-11-26 10:58:09 +0300 MSK -> 2019-11-26 10:58:09 +0300 to pass into Date()
    const updatedDate = new Date(updated).getTime();
    const diff = getMillisecondsFromUnixEpoch() - updatedDate;

    if (humanize) {
      return formatDuration(diff, compact);
    }

    return diff;
  },
});
