import { getInjectable } from "@ogre-tools/injectable";
import userPreferencesStateInjectable from "./state.injectable";
import { runInAction } from "mobx";

const getClusterPageMenuOrderInjectable = getInjectable({
  id: "cluster-page-menu-order-injectable",

  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return (key: string, defaultValue: number): number => {
      runInAction(() => {
        if (!state.clusterPageMenuOrder) {
          // @ts-ignore
          state.clusterPageMenuOrder = {};
        }
        if (state.clusterPageMenuOrder![key] === undefined) {
          state.clusterPageMenuOrder![key] = defaultValue;
        }
      })

      return state.clusterPageMenuOrder![key]!;
    }
  }
});

export default getClusterPageMenuOrderInjectable;
