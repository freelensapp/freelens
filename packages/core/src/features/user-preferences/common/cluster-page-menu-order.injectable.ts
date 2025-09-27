import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import sidebarStorageInjectable, {
  SidebarStorageState
} from "../../../renderer/components/layout/sidebar-storage/sidebar-storage.injectable";
import { StorageLayer } from "../../../renderer/utils/storage-helper";

export const getClusterPageMenuOrderInjectable = getInjectable({
  id: "get-cluster-page-menu-order-injectable",

  instantiate: (di) => {
    return (key: string, defaultValue: number): number => {
      const sidebarStorageState: StorageLayer<SidebarStorageState> = di.inject(sidebarStorageInjectable);
      const state: SidebarStorageState = sidebarStorageState.get();

      runInAction(() => {
        if (!state.order) {
          state.order = {};
        }
        if (state.order[key] === undefined) {
          addClusterPageMenuOrder(state, key, defaultValue);
        }
      })

      return state.order[key];
    }
  }
});

export default getClusterPageMenuOrderInjectable;
