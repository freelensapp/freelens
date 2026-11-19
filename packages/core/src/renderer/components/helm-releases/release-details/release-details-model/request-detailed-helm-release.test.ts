/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import requestHelmReleaseInjectable from "../../../../../features/helm-releases/renderer/request-helm-release.injectable";
import requestListHelmReleasesInjectable from "../../../../../features/helm-releases/renderer/request-list-helm-releases.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import requestDetailedHelmReleaseInjectable from "./request-detailed-helm-release.injectable";

import type { HelmReleaseDataWithResources } from "../../../../../features/helm-releases/common/channels";

const details: HelmReleaseDataWithResources = {
  name: "a",
  namespace: "ns",
  version: 2,
  config: {},
  manifest: "",
  resources: [],
  info: {
    first_deployed: "",
    last_deployed: "2026-11-18T07:00:00Z",
    deleted: "",
    description: "",
    status: "deployed",
    notes: "",
  },
  listed: {
    name: "a",
    namespace: "ns",
    revision: "2",
    updated: "2026-11-18T07:00:00Z",
    status: "deployed",
    chart: "c-1.0.0",
    app_version: "2.0",
  },
};

describe("requesting the details of a Helm release", () => {
  it("takes the row of the release from its details, without listing the releases of the namespace", async () => {
    const di = getDiForUnitTesting();
    const requestHelmRelease = vi.fn(async () => ({ callWasSuccessful: true as const, response: details }));
    const requestListHelmReleases = vi.fn();

    di.override(requestHelmReleaseInjectable, () => requestHelmRelease);
    di.override(requestListHelmReleasesInjectable, () => requestListHelmReleases);

    const result = await di.inject(requestDetailedHelmReleaseInjectable)({
      clusterId: "some-cluster",
      namespace: "ns",
      releaseName: "a",
    });

    expect(requestListHelmReleases).not.toHaveBeenCalled();
    expect(requestHelmRelease).toHaveBeenCalledWith({ clusterId: "some-cluster", namespace: "ns", releaseName: "a" });
    expect(result.callWasSuccessful && result.response.details).toBe(details);
    expect(
      result.callWasSuccessful && [
        result.response.release.getName(),
        result.response.release.getNs(),
        result.response.release.getChart(),
        result.response.release.getVersion(),
        result.response.release.getRevision(),
        result.response.release.getStatus(),
      ],
    ).toEqual(["a", "ns", "c", "1.0.0", 2, "Deployed"]);
  });

  it("returns the error of the details", async () => {
    const di = getDiForUnitTesting();

    di.override(requestHelmReleaseInjectable, () => async () => ({
      callWasSuccessful: false as const,
      error: "release a not found in ns",
    }));

    expect(
      await di.inject(requestDetailedHelmReleaseInjectable)({
        clusterId: "some-cluster",
        namespace: "ns",
        releaseName: "a",
      }),
    ).toEqual({ callWasSuccessful: false, error: "release a not found in ns" });
  });
});
