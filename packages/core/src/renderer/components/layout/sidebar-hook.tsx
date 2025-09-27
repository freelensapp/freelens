import { runInAction } from "mobx";
import { SidebarStorageState } from "./sidebar-storage/sidebar-storage.injectable";
import type { StorageLayer } from "../../utils/storage-helper";

interface Dependencies {
  sidebarStorage: StorageLayer<SidebarStorageState>;
}

const useSidebarHook = ({ sidebarStorage }: Dependencies) => {
  const storage = sidebarStorage.get();

  const saveOrderInfo = (startIndex: number, releaseIndex: number) => {
    const sidebarStorageElements = Object.keys(storage.order);

    if (startIndex === releaseIndex) return;
    if (startIndex < 0) return;
    if (startIndex >= sidebarStorageElements.length) return;
    if (releaseIndex < 0) return;
    if (releaseIndex >= sidebarStorageElements.length) return;

    const [itemToMove] = sidebarStorageElements.splice(startIndex, 1);
    sidebarStorageElements.splice(releaseIndex, 0, itemToMove);

    const newOrder = Object.fromEntries(
      sidebarStorageElements.map((item, index) => [item, (index + 1) * 10])
    );

    // @ts-ignore
    runInAction(() => storage.order = newOrder);
  }

  return { saveOrderInfo }
}

export default useSidebarHook;
