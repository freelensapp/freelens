/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import listClusterHelmReleasesInjectable from "../../../main/helm/helm-service/list-helm-releases.injectable";
import getClusterByIdInjectable from "../../cluster/storage/common/get-by-id.injectable";
import handleListHelmReleasesInjectable from "./handle-list-helm-releases.injectable";

import type { Cluster } from "../../../common/cluster/cluster";
import type { ListClusterHelmReleases } from "../../../main/helm/helm-service/list-helm-releases.injectable";
import type { ListedHelmRelease, ListHelmReleasesResponse } from "../common/channels";

describe("handle list helm releases", () => {
  let cluster: Cluster;
  let listHelmReleasesHandler: (args: {
    clusterId: string;
    namespace?: string;
  }) => ListHelmReleasesResponse | Promise<ListHelmReleasesResponse>;
  let listClusterHelmReleasesMock: jest.MockedFunction<ListClusterHelmReleases>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    cluster = {
      id: "some-cluster-id",
    } as Cluster;

    listClusterHelmReleasesMock = jest.fn();

    di.override(listClusterHelmReleasesInjectable, () => listClusterHelmReleasesMock);
    di.override(getClusterByIdInjectable, () => (clusterId) => (clusterId === cluster.id ? cluster : undefined));

    di.permitSideEffects(handleListHelmReleasesInjectable);

    listHelmReleasesHandler = di.inject(handleListHelmReleasesInjectable).handler;
  });

  it("reads releases from cache on repeated request", async () => {
    const listedHelmReleases: ListedHelmRelease[] = [
      {
        name: "some-release",
        namespace: "default",
        revision: "1",
        updated: "2026-01-01T00:00:00+0000",
        status: "deployed",
        chart: "some-chart-1.0.0",
        app_version: "1.0.0",
      },
    ];

    listClusterHelmReleasesMock.mockResolvedValue({
      callWasSuccessful: true,
      response: listedHelmReleases,
    });

    const firstCallResult = await listHelmReleasesHandler({
      clusterId: "some-cluster-id",
      namespace: "default",
    });

    const secondCallResult = await listHelmReleasesHandler({
      clusterId: "some-cluster-id",
      namespace: "default",
    });

    expect(firstCallResult).toEqual({
      callWasSuccessful: true,
      response: listedHelmReleases,
    });
    expect(secondCallResult).toEqual({
      callWasSuccessful: true,
      response: listedHelmReleases,
    });
    expect(listClusterHelmReleasesMock).toHaveBeenCalledTimes(1);
  });
});
