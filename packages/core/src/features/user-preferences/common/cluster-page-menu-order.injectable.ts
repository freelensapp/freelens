import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import sidebarStorageInjectable, {
  SidebarStorageState
} from "../../../renderer/components/layout/sidebar-storage/sidebar-storage.injectable";

const getClusterPageMenuOrderInjectable = getInjectable({
  id: "cluster-page-menu-order-injectable",

  instantiate: (di) => {
    const state: SidebarStorageState = di.inject(sidebarStorageInjectable).get();

    return (key: string, defaultValue: number): number => {
      runInAction(() => {
        if (!state.order) {
          state.order = {};
        }
        if (state.order[key] === undefined) {
          state.order[key] = defaultValue;
        }
      })

      return state.order[key];
    }
  }
});

export default getClusterPageMenuOrderInjectable;
