import { byOrderNumber } from "@freelensapp/utilities";
import { getInjectable, type InjectionInstanceWithMeta } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import { type SidebarItemDeclaration, type SidebarItemRegistration, sidebarItemInjectionToken } from "./tokens";

const getSidebarItemsHierarchy = (
  registrations: InjectionInstanceWithMeta<SidebarItemRegistration>[],
  parentId: string | null,
): SidebarItemDeclaration[] =>
  registrations
    .filter(({ instance }) => instance.parentId === parentId)
    .map(({ instance: { isActive, isVisible, ...registration }, meta }) => {
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
    .sort(byOrderNumber);

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
