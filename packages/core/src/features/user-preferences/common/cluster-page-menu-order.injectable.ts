import { getInjectable } from "@ogre-tools/injectable";
import { computed, runInAction } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";

export const getClusterPageMenuOrderInjectable = getInjectable({
  id: "get-cluster-page-menu-order-injectable",

  instantiate: (di) => {
    
    const userPreferences = di.inject(userPreferencesStateInjectable);

    return (key: string, defaultValue: number) => {
      if (!userPreferences.clusterPageMenuOrder) {

        runInAction(() => userPreferences.clusterPageMenuOrder = {});
      }
      if (!userPreferences.clusterPageMenuOrder!.hasOwnProperty(key)) {
        runInAction(() => userPreferences.clusterPageMenuOrder![key] = defaultValue);
      }

      return computed(() => userPreferences.clusterPageMenuOrder![key]);
    };
  },
});
