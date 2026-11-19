import { runInAction } from "mobx";
import { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

interface Dependencies {
  userPreferences: UserPreferencesState;
}

type OrderedItem = Pick<SidebarItemDeclaration, "id" | "orderKey">;

// The key of the saved order that places an item: its own id, or the key that the top-level items of an extension share.
const orderKeyOf = (item: OrderedItem) => item.orderKey ?? item.id;

const useSidebarHook = ({ userPreferences }: Dependencies) => {
  /**
   * Moves the key of the dragged item to the place of the key of the item it was dropped on, in the saved order of the
   * sidebar. The keys move by name, not by the indexes of the sidebar: the saved order can hold keys that no item reads,
   * such as the one of an extension removed from the disk, and the top-level items of an extension share one key.
   */
  const saveOrderInfo = (
    dragged: OrderedItem | undefined,
    target: OrderedItem | undefined,
    items: OrderedItem[] = [],
  ) => {
    if (!dragged || !target) return;

    const draggedKey = orderKeyOf(dragged);
    const targetKey = orderKeyOf(target);

    if (draggedKey === targetKey) return;

    const keys = Object.entries(userPreferences.clusterPageMenuOrder ?? {})
      .sort(([, valueA], [, valueB]) => valueA - valueB)
      .map(([key]) => key);

    // A key that is not saved, such as one of an extension after a reset of the order, comes last, where its item is.
    for (const key of items.map(orderKeyOf)) {
      if (!keys.includes(key)) keys.push(key);
    }

    const from = keys.indexOf(draggedKey);
    const to = keys.indexOf(targetKey);

    if (from < 0 || to < 0) return;

    keys.splice(from, 1);
    keys.splice(to, 0, draggedKey);

    runInAction(() => {
      userPreferences.clusterPageMenuOrder = Object.fromEntries(keys.map((key, index) => [key, (index + 1) * 10]));
    });
  };

  return { saveOrderInfo };
};

export default useSidebarHook;
