/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import type { HelmRepo } from "../../../common/helm/helm-repo";
import helmChartManagerInjectable from "../helm-chart-manager.injectable";
import getActiveHelmRepositoryInjectable from "../repositories/get-active-helm-repository.injectable";

const getHelmChartValuesInjectable = getInjectable({
  id: "get-helm-chart-values",

  instantiate: (di) => {
    const getActiveHelmRepository = di.inject(getActiveHelmRepositoryInjectable);
    const getChartManager = (repo: HelmRepo) => di.inject(helmChartManagerInjectable, repo);

    return async (repoName: string, chartName: string, version = "") => {
      const repo = await getActiveHelmRepository(repoName);

      if (!repo) {
        return undefined;
      }

      return getChartManager(repo).getValues(chartName, version);
    };
  },
});

export default getHelmChartValuesInjectable;
