import { getInjectable } from "@ogre-tools/injectable";
import sidebarStorageInjectable, {
  SidebarStorageState
} from "../../../renderer/components/layout/sidebar-storage/sidebar-storage.injectable";
import { StorageLayer } from "../../../renderer/utils/storage-helper";
import { computed } from "mobx";

export const getClusterPageMenuOrderInjectable = getInjectable({
  id: "get-cluster-page-menu-order-injectable",

  instantiate: (di) => {
    const sidebarStorage: StorageLayer<SidebarStorageState> = di.inject(sidebarStorageInjectable);

    return (key: string, defaultValue: number) => {
      if (!sidebarStorage.get().order) {
        sidebarStorage.set({
          ...sidebarStorage.get(),
          order: {}
        });
      }
      if (!sidebarStorage.get().order.hasOwnProperty(key)) {
        sidebarStorage.merge((draft) => {
          draft.order[key] = defaultValue
        })
      }
      return computed(() => sidebarStorage.get().order[key]);
    }
  }
});
