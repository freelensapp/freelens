/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import broadcastConnectionUpdateInjectable from "./broadcast-connection-update.injectable";
import requestApiResourcesInjectable from "./request-api-resources.injectable";
import requestCoreApiVersionsInjectable from "./request-core-api-versions.injectable";
import requestKubeApiResourcesForInjectable from "./request-kube-api-resources-for.injectable";
import requestNonCoreApiVersionsInjectable from "./request-non-core-api-versions.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { DiContainer } from "@ogre-tools/injectable";

import type { Cluster } from "../../common/cluster/cluster";
import type { KubeApiResource } from "../../common/rbac";
import type { KubeResourceListGroup } from "./api-versions-requester";
import type { RequestApiResources } from "./request-api-resources.injectable";

describe("requesting the kube API resources of a cluster", () => {
  let di: DiContainer;
  let requestApiResources: RequestApiResources;
  let canceled: boolean;
  let updates: string[];
  let groupRequests: string[];
  let requestCoreApiVersions: () => AsyncResult<KubeResourceListGroup[], Error>;
  let requestKubeApiResources: (group: KubeResourceListGroup) => AsyncResult<KubeApiResource[], Error>;
  const cluster = { id: "some-cluster-id" } as Cluster;
  const isCanceled = () => canceled;
  const groups = Array.from({ length: 8 }, (_, index) => ({
    group: `group-${index}`,
    version: "v1",
    path: `/apis/group-${index}/v1`,
  }));
  const failure = { callWasSuccessful: false as const, error: new Error("fetch failed (The client is destroyed)") };

  beforeEach(() => {
    vi.useFakeTimers();
    di = getDiForUnitTesting();
    canceled = false;
    updates = [];
    groupRequests = [];
    requestCoreApiVersions = async () => ({ callWasSuccessful: true, response: groups });
    requestKubeApiResources = async () => failure;

    di.override(requestCoreApiVersionsInjectable, () => ({ orderNumber: 10, request: () => requestCoreApiVersions() }));
    di.override(requestNonCoreApiVersionsInjectable, () => ({
      orderNumber: 20,
      request: async () => ({ callWasSuccessful: true, response: [] }),
    }));
    di.override(requestKubeApiResourcesForInjectable, () => () => async (group) => {
      groupRequests.push(group.path);

      return requestKubeApiResources(group);
    });
    di.override(broadcastConnectionUpdateInjectable, () => (update) => {
      updates.push(update.message);
    });

    requestApiResources = di.inject(requestApiResourcesInjectable);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("warns of each group it could not list", async () => {
    const result = await requestApiResources(cluster, { isCanceled });

    expect(result).toEqual({ callWasSuccessful: true, response: [] });
    expect(groupRequests).toHaveLength(groups.length);
    expect(updates).toHaveLength(groups.length);
  });

  it("sends none of the queued requests of the groups once canceled, and fails without warnings", async () => {
    // Canceled while the first five requests are on their way.
    requestKubeApiResources = async () => {
      await Promise.resolve();
      canceled = true;

      return failure;
    };

    const result = await requestApiResources(cluster, { isCanceled });

    expect(result.callWasSuccessful).toBe(false);
    // The first five go out together, the rest wait in the queue.
    expect(groupRequests).toHaveLength(5);
    expect(updates).toEqual([]);
  });

  it("stops retrying to list the groups once canceled, and fails without warnings", async () => {
    let attempts = 0;

    requestCoreApiVersions = async () => {
      attempts += 1;
      canceled = true;

      return failure;
    };

    const result = requestApiResources(cluster, { isCanceled });

    await vi.runAllTimersAsync();

    expect((await result).callWasSuccessful).toBe(false);
    expect(attempts).toBe(1);
    expect(groupRequests).toEqual([]);
    expect(updates).toEqual([]);
  });
});
