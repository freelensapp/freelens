/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import helmChartManagerInjectable from "../helm-chart-manager.injectable";
import getActiveHelmRepositoriesInjectable from "../repositories/get-active-helm-repositories/get-active-helm-repositories.injectable";

import type { HelmRepo } from "../../../common/helm/helm-repo";

const listHelmChartsInjectable = getInjectable({
  id: "list-helm-charts",

  instantiate: (di) => {
    const getActiveHelmRepositories = di.inject(getActiveHelmRepositoriesInjectable);
    const getChartManager = (repo: HelmRepo) => di.inject(helmChartManagerInjectable, repo);

    return async () => {
      const result = await getActiveHelmRepositories();

      if (!result.callWasSuccessful) {
        throw new Error(result.error);
      }

      const repositories = result.response;

      return object.fromEntries(
        await Promise.all(repositories.map(async (repo) => [repo.name, await getChartManager(repo).charts()] as const)),
      );
    };
  },
});

export default listHelmChartsInjectable;
