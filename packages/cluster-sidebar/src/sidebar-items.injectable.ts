import { byOrderNumber } from "@freelensapp/utilities";
import { getInjectable, type InjectionInstanceWithMeta } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import { type SidebarItemDeclaration, type SidebarItemRegistration, sidebarItemInjectionToken } from "./tokens";

interface PlacedItem {
  item: Pick<SidebarItemRegistration, "orderNumber" | "orderNumberInBlock">;
  /** The place of the first item with the same order key, which places the block of the item. */
  block: number;
  index: number;
}

// Compares without subtracting, so that two infinite numbers compare equal.
const compareNumbers = (left: number, right: number) => (left < right ? -1 : left > right ? 1 : 0);

/**
 * Sorts by `orderNumber`, keeps the items that share an order key together as one block in the place of its first
 * item, and orders the items of a block by `orderNumberInBlock`. The order of registration decides the rest. Without
 * the block, the top-level items of two extensions placed at the same number would interleave.
 */
const bySidebarOrder = (left: PlacedItem, right: PlacedItem) =>
  byOrderNumber(left.item, right.item) ||
  left.block - right.block ||
  compareNumbers(
    left.item.orderNumberInBlock ?? Number.POSITIVE_INFINITY,
    right.item.orderNumberInBlock ?? Number.POSITIVE_INFINITY,
  ) ||
  left.index - right.index;

const orderKeyOf = (item: Pick<SidebarItemDeclaration, "id" | "orderKey">) => item.orderKey ?? item.id;

const getSidebarItemsHierarchy = (
  registrations: InjectionInstanceWithMeta<SidebarItemRegistration>[],
  parentId: string | null,
): SidebarItemDeclaration[] =>
  registrations
    .filter(({ instance }) => instance.parentId === parentId)
    .map(({ instance: { isActive, isVisible, isHiddenInTree, ...registration }, meta }) => {
      // @ogre-tools 23 namespaces the id of an injectable registered at runtime
      // through a namespaced `di` (e.g. extension-scoped sidebar items) as
      // "<namespace>:<declaredId>". Children link to their parent by its declared
      // (bare) parentId and the id is surfaced as a `data-testid`, so use the bare
      // id here. Container-level ids have no namespace and are used verbatim.
      const id = meta.id.includes(":") ? meta.id.slice(meta.id.lastIndexOf(":") + 1) : meta.id;
      const children = getSidebarItemsHierarchy(registrations, id);

      return {
        ...registration,
        id,
        children,
        isVisible: computed(() => {
          if (children.length === 0) {
            if (isVisible) {
              return isVisible.get();
            }

            return true;
          }

          return children.some((child) => child.isVisible.get());
        }),
        // A parent whose visible children are all hidden in the tree is hidden
        // with them, so a group left with nothing to show leaves the tree.
        isHiddenInTree: computed(() => {
          if (children.length === 0) {
            return isHiddenInTree?.get() ?? false;
          }

          return !children.some((child) => child.isVisible.get() && !child.isHiddenInTree.get());
        }),
        isActive: computed(() => {
          if (children.length === 0) {
            if (isActive) {
              return isActive.get();
            }

            return false;
          }

          return children.some((child) => child.isActive.get());
        }),
      };
    })
    .map((item, index, items) => ({
      item,
      index,
      block: items.findIndex((other) => orderKeyOf(other) === orderKeyOf(item)),
    }))
    .sort(bySidebarOrder)
    .map(({ item }) => item);

const sidebarItemsInjectable = getInjectable({
  id: "sidebar-items",
  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);
    const sidebarItemRegistrations = computedInjectMany(sidebarItemInjectionToken);

    return computed(() => {
      void sidebarItemRegistrations.get();

      return getSidebarItemsHierarchy(di.injectManyWithMeta(sidebarItemInjectionToken), null);
    });
  },
});

export default sidebarItemsInjectable;
