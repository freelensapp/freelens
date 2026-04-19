/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createContainer } from "@ogre-tools/injectable";
import helmReleaseCacheInjectable from "./helm-release-cache.injectable";

import type { ListedHelmRelease } from "../common/channels";
import type { HelmReleaseCache } from "./helm-release-cache.injectable";

describe("helm-release-cache", () => {
  let helmReleaseCache: HelmReleaseCache;

  const listedHelmRelease: ListedHelmRelease = {
    name: "some-release",
    namespace: "some-namespace",
    revision: "1",
    updated: "2026-01-01T00:00:00+0000",
    status: "deployed",
    chart: "some-chart-1.0.0",
    app_version: "1.0.0",
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const di = createContainer("main");

    di.register(helmReleaseCacheInjectable);

    helmReleaseCache = di.inject(helmReleaseCacheInjectable);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns undefined on cache miss", () => {
    expect(helmReleaseCache.get("cluster-1", "some-namespace")).toBeUndefined();
  });

  it("stores and returns cached data for namespaced key", () => {
    helmReleaseCache.set("cluster-1", "some-namespace", [listedHelmRelease]);

    expect(helmReleaseCache.get("cluster-1", "some-namespace")).toEqual([listedHelmRelease]);
  });

  it("stores and returns cached data for all namespaces key", () => {
    helmReleaseCache.set("cluster-1", undefined, [listedHelmRelease]);

    expect(helmReleaseCache.get("cluster-1")).toEqual([listedHelmRelease]);
  });

  it("does not expire cache entry at exactly 30 seconds", () => {
    helmReleaseCache.set("cluster-1", "some-namespace", [listedHelmRelease]);

    jest.advanceTimersByTime(30_000);

    expect(helmReleaseCache.get("cluster-1", "some-namespace")).toEqual([listedHelmRelease]);
  });

  it("expires cache entry when older than 30 seconds", () => {
    helmReleaseCache.set("cluster-1", "some-namespace", [listedHelmRelease]);

    jest.advanceTimersByTime(30_001);

    expect(helmReleaseCache.get("cluster-1", "some-namespace")).toBeUndefined();
  });

  it("invalidates specific key", () => {
    helmReleaseCache.set("cluster-1", "some-namespace", [listedHelmRelease]);
    helmReleaseCache.set("cluster-1", "some-other-namespace", [
      {
        ...listedHelmRelease,
        namespace: "some-other-namespace",
      },
    ]);

    helmReleaseCache.invalidate("cluster-1", "some-namespace");

    expect(helmReleaseCache.get("cluster-1", "some-namespace")).toBeUndefined();
    expect(helmReleaseCache.get("cluster-1", "some-other-namespace")).toEqual([
      {
        ...listedHelmRelease,
        namespace: "some-other-namespace",
      },
    ]);
  });

  it("invalidates all cache entries for cluster", () => {
    helmReleaseCache.set("cluster-1", "some-namespace", [listedHelmRelease]);
    helmReleaseCache.set("cluster-1", undefined, [listedHelmRelease]);
    helmReleaseCache.set("cluster-2", "some-namespace", [listedHelmRelease]);

    helmReleaseCache.invalidateCluster("cluster-1");

    expect(helmReleaseCache.get("cluster-1", "some-namespace")).toBeUndefined();
    expect(helmReleaseCache.get("cluster-1")).toBeUndefined();
    expect(helmReleaseCache.get("cluster-2", "some-namespace")).toEqual([listedHelmRelease]);
  });

  it("clears entire cache", () => {
    helmReleaseCache.set("cluster-1", "some-namespace", [listedHelmRelease]);
    helmReleaseCache.set("cluster-2", undefined, [listedHelmRelease]);

    helmReleaseCache.clear();

    expect(helmReleaseCache.get("cluster-1", "some-namespace")).toBeUndefined();
    expect(helmReleaseCache.get("cluster-2")).toBeUndefined();
  });
});
