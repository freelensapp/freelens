/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import readFileInjectable from "../../common/fs/read-file.injectable";
import statInjectable from "../../common/fs/stat.injectable";
import type { HelmRepo } from "../../common/helm/helm-repo";
import execHelmInjectable from "./exec-helm/exec-helm.injectable";
import { HelmChartManager } from "./helm-chart-manager";
import helmChartManagerCacheInjectable from "./helm-chart-manager-cache.injectable";

const helmChartManagerInjectable = getInjectable({
  id: "helm-chart-manager",

  instantiate: (di, repo: HelmRepo) =>
    new HelmChartManager(
      {
        cache: di.inject(helmChartManagerCacheInjectable),
        logger: di.inject(loggerInjectionToken),
        execHelm: di.inject(execHelmInjectable),
        readFile: di.inject(readFileInjectable),
        stat: di.inject(statInjectable),
      },
      repo,
    ),

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, repo: HelmRepo) => repo.name,
  }),
});

export default helmChartManagerInjectable;
