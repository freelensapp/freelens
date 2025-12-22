import { getInjectable } from "@ogre-tools/injectable";
import { SidebarMenu } from "./sidebar-menu";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";

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