/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";
import createDockTabStoreInjectable from "../dock-tab-store/create-dock-tab-store.injectable";
import { InstallChartTabStore } from "./store";

import type { HelmReleaseUpdateDetails } from "../../../../common/k8s-api/endpoints/helm-releases.api";

const installChartTabStoreInjectable = getInjectable({
  id: "install-chart-tab-store",

  instantiate: (di) => {
    const createDockTabStore = di.inject(createDockTabStoreInjectable);

    return new InstallChartTabStore({
      createStorage: di.inject(createStorageInjectable),
      versionsStore: createDockTabStore<string[]>(),
      detailsStore: createDockTabStore<HelmReleaseUpdateDetails>(),
    });
  },
});

export default installChartTabStoreInjectable;
