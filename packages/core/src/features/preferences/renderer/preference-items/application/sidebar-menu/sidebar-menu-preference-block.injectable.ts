import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { SidebarMenu } from "./sidebar-menu";

const sidebarMenuPreferenceBlockInjectable = getInjectable({
  id: "sidebar-menu-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "sidebar-menu",
    parentId: "application-page",
    orderNumber: 40,
    Component: SidebarMenu,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default sidebarMenuPreferenceBlockInjectable;
