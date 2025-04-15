/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import type { HelmRelease } from "../../../../common/k8s-api/endpoints/helm-releases.api";
import type { DockTabStore } from "../dock-tab-store/dock-tab.store";
import type { DockStore, DockTabCreateSpecific, TabId } from "../dock/store";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import getRandomUpgradeChartTabIdInjectable from "./get-random-upgrade-chart-tab-id.injectable";
import type { IChartUpgradeData } from "./store.injectable";
import upgradeChartTabStoreInjectable from "./store.injectable";

interface Dependencies {
  upgradeChartStore: DockTabStore<IChartUpgradeData>;
  dockStore: DockStore;
  getRandomId: () => string;
}

const createUpgradeChartTab =
  ({ upgradeChartStore, dockStore, getRandomId }: Dependencies) =>
  (release: HelmRelease, tabParams: DockTabCreateSpecific = {}): TabId => {
    const tabId = upgradeChartStore.findTabIdFromData(
      (val) => val.releaseName === release.getName() && val.releaseNamespace === release.getNs(),
    );

    if (tabId) {
      dockStore.open();
      dockStore.selectTab(tabId);

      return tabId;
    }

    return runInAction(() => {
      const tab = dockStore.createTab(
        {
          id: getRandomId(),
          title: `Helm Upgrade: ${release.getName()}`,
          ...tabParams,
          kind: TabKind.UPGRADE_CHART,
        },
        false,
      );

      upgradeChartStore.setData(tab.id, {
        releaseName: release.getName(),
        releaseNamespace: release.getNs(),
      });

      return tab.id;
    });
  };

const createUpgradeChartTabInjectable = getInjectable({
  id: "create-upgrade-chart-tab",

  instantiate: (di) =>
    createUpgradeChartTab({
      upgradeChartStore: di.inject(upgradeChartTabStoreInjectable),
      dockStore: di.inject(dockStoreInjectable),
      getRandomId: di.inject(getRandomUpgradeChartTabIdInjectable),
    }),
});

export default createUpgradeChartTabInjectable;
