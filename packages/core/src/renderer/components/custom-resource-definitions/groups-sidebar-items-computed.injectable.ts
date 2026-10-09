/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { computedAnd, iter, noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { sortBy } from "es-toolkit";
import { matches } from "es-toolkit/compat";
import { computed } from "mobx";
import customResourcesRouteInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/custom-resources-route.injectable";
import navigateToCustomResourcesInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import { shouldShowResourceInjectionToken } from "../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import routePathParametersInjectable from "../../routes/route-path-parameters.injectable";
import discoveredCustomResourcesInjectable, {
  inPreferredVersions,
} from "../custom-resources/discovered-custom-resources.injectable";
import customResourcesSidebarItemInjectable from "../custom-resources/sidebar-item.injectable";
import customResourceDefinitionsInjectable from "./definitions.injectable";

import type { SidebarItemRegistration } from "@freelensapp/cluster-sidebar";

export const sideBarItemCustomResourcePrefix = "sidebar-item-custom-resource-group";

interface SidebarCustomResource {
  group: string;
  pluralName: string;
  kind: string;
}

const titleCaseSplitRegex = /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

const formatResourceKind = (resourceKind: string) => resourceKind.split(titleCaseSplitRegex).join(" ");

const customResourceDefinitionGroupsSidebarItemsComputedInjectable = getInjectable({
  id: "custom-resource-definition-groups-sidebar-items-computed",
  instantiate: (di) => {
    const customResourceDefinitions = di.inject(customResourceDefinitionsInjectable);
    const discoveredCustomResources = di.inject(discoveredCustomResourcesInjectable);
    const navigateToCustomResources = di.inject(navigateToCustomResourcesInjectable);
    const customResourcesRoute = di.inject(customResourcesRouteInjectable);
    const pathParameters = di.inject(routePathParametersInjectable, customResourcesRoute);

    const toCustomResourceGroupToSidebarItems = (
      [group, resources]: [string, SidebarCustomResource[]],
      index: number,
    ) => {
      const customResourceGroupSidebarItem = getInjectable({
        id: `${sideBarItemCustomResourcePrefix}-${group}`,
        instantiate: (): SidebarItemRegistration => ({
          parentId: customResourcesSidebarItemInjectable.id,
          onClick: noop,
          title: group.replaceAll(".", "\u200b."), // Replace dots with zero-width spaces to allow line breaks
          orderNumber: index + 1,
        }),
        injectionToken: sidebarItemInjectionToken,
      });
      const customResourceSidebarItems = resources.map(({ pluralName, kind }, index) => {
        const parameters = {
          group,
          name: pluralName,
        };

        return getInjectable({
          id: `${sideBarItemCustomResourcePrefix}-${group}/${pluralName}`,
          instantiate: (di): SidebarItemRegistration => ({
            parentId: customResourceGroupSidebarItem.id,
            onClick: () => navigateToCustomResources(parameters),
            title: formatResourceKind(kind),
            isActive: computedAnd(
              di.inject(routeIsActiveInjectable, customResourcesRoute),
              computed(() => matches(parameters)(pathParameters.get())),
            ),
            isVisible: di.inject(shouldShowResourceInjectionToken, {
              group,
              apiName: pluralName,
            }),
            orderNumber: index,
          }),
          injectionToken: sidebarItemInjectionToken,
        });
      });

      return [customResourceGroupSidebarItem, ...customResourceSidebarItems];
    };

    // The items of the discovered custom resources have the ids of the items
    // of their definitions, so that a favorite of one is a favorite of both.
    const getCustomResources = (): SidebarCustomResource[] => {
      const discovered = discoveredCustomResources.get();

      if (discovered.length === 0) {
        return customResourceDefinitions.get().map((crd) => ({
          group: crd.getGroup(),
          pluralName: crd.getPluralName(),
          kind: crd.getResourceKind(),
        }));
      }

      return sortBy(inPreferredVersions(discovered), ["group", "apiName"]).map(({ group, apiName, kind }) => ({
        group,
        pluralName: apiName,
        kind,
      }));
    };

    return computed(() => {
      const customResourceGroups = iter
        .chain(getCustomResources().values())
        .map((resource) => [resource.group, resource] as const)
        .toMap();

      return Array.from(customResourceGroups.entries(), toCustomResourceGroupToSidebarItems).flat();
    });
  },
});

export default customResourceDefinitionGroupsSidebarItemsComputedInjectable;
