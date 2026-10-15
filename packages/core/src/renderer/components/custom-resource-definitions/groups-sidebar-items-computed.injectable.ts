/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
import { computedAnd, iter, noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { sortBy } from "es-toolkit";
import { matches } from "es-toolkit/compat";
import { computed } from "mobx";
import { createElement } from "react";
import customResourcesRouteInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/custom-resources-route.injectable";
import navigateToCustomResourcesInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import { shouldShowResourceInjectionToken } from "../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import routePathParametersInjectable from "../../routes/route-path-parameters.injectable";
import discoveredCustomResourcesInjectable, {
  inPreferredVersions,
} from "../custom-resources/discovered-custom-resources.injectable";
import customResourcesSidebarItemInjectable from "../custom-resources/sidebar-item.injectable";
import { getCustomResourceKey } from "./custom-resource-registration";
import customResourcesPresentedByExtensionsInjectable from "./custom-resources-presented-by-extensions.injectable";
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
const getGroupLabel = (group: string) => {
  const path = group.split(".").reverse();

  return path.length > 1 ? path.at(-1)! : group;
};

const customResourceDefinitionGroupsSidebarItemsComputedInjectable = getInjectable({
  id: "custom-resource-definition-groups-sidebar-items-computed",
  instantiate: (di) => {
    const customResourceDefinitions = di.inject(customResourceDefinitionsInjectable);
    const discoveredCustomResources = di.inject(discoveredCustomResourcesInjectable);
    const navigateToCustomResources = di.inject(navigateToCustomResourcesInjectable);
    const customResourcesRoute = di.inject(customResourcesRouteInjectable);
    const pathParameters = di.inject(routePathParametersInjectable, customResourcesRoute);
    const customResourcesPresentedByExtensions = di.inject(customResourcesPresentedByExtensionsInjectable);
    const userPreferencesState = di.inject(userPreferencesStateInjectable);

    const toCustomResourceGroupToSidebarItems = (
      [group, resources]: [string, SidebarCustomResource[]],
      orderNumber: number,
      parentId: string,
      title: string,
      includeGroupItem = true,
      resourceOrderOffset = 0,
    ) => {
      const customResourceGroupSidebarItem = includeGroupItem
        ? getInjectable({
            id: `${sideBarItemCustomResourcePrefix}-${group}`,
            instantiate: (): SidebarItemRegistration => ({
              parentId,
              onClick: noop,
              getIcon: () => createElement(Icon, { material: "folder" }),
              title,
              orderNumber,
            }),
            injectionToken: sidebarItemInjectionToken,
          })
        : undefined;
      const customResourceSidebarItems = resources.map(({ pluralName, kind }, index) => {
        const parameters = {
          group,
          name: pluralName,
        };

        return getInjectable({
          id: `${sideBarItemCustomResourcePrefix}-${group}/${pluralName}`,
          instantiate: (di): SidebarItemRegistration => ({
            parentId: customResourceGroupSidebarItem?.id ?? parentId,
            onClick: () => navigateToCustomResources(parameters),
            getIcon: () => createElement(Icon, { material: "extension" }),
            title: formatResourceKind(kind),
            isActive: computedAnd(
              di.inject(routeIsActiveInjectable, customResourcesRoute),
              computed(() => matches(parameters)(pathParameters.get())),
            ),
            isVisible: di.inject(shouldShowResourceInjectionToken, {
              group,
              apiName: pluralName,
            }),
            // An enabled extension that registered the resource in its
            // `customResources` lists it under its own entry. The item stays
            // registered, so the command palette and a favorite of it still
            // reach the host's list.
            isHiddenInTree: computed(() =>
              customResourcesPresentedByExtensions.get().has(getCustomResourceKey(group, pluralName)),
            ),
            orderNumber: resourceOrderOffset + index,
          }),
          injectionToken: sidebarItemInjectionToken,
        });
      });

      return customResourceGroupSidebarItem
        ? [customResourceGroupSidebarItem, ...customResourceSidebarItems]
        : customResourceSidebarItems;
    };

    const toCustomResourceFolderSidebarItem = (path: string[], orderNumber: number, parentId: string) =>
      getInjectable({
        id: `${sideBarItemCustomResourcePrefix}-folder-${path.join(".")}`,
        instantiate: (): SidebarItemRegistration => ({
          parentId,
          onClick: noop,
          getIcon: () => createElement(Icon, { material: "folder" }),
          title: path.at(-1)!,
          orderNumber,
        }),
        injectionToken: sidebarItemInjectionToken,
      });

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

      if (!userPreferencesState.groupCustomResourcesByDomain) {
        return Array.from(customResourceGroups.entries()).flatMap((groupEntry, index) => {
          const [group] = groupEntry;

          return toCustomResourceGroupToSidebarItems(
            groupEntry,
            index + 1,
            customResourcesSidebarItemInjectable.id,
            group.replaceAll(".", "\u200b."),
          );
        });
      }

      const folders = new Map<string, { path: string[] }>();
      const groupsByParent = new Map<string, [string, SidebarCustomResource[]][]>();

      for (const groupEntry of customResourceGroups.entries()) {
        const [group] = groupEntry;
        // Kubernetes API groups are DNS names. Reversing their labels groups
        // related APIs by their shared domain (for example, *.crossplane.io).
        const path = group.split(".").reverse();
        let parentPath: string[] = [];

        for (const segment of path.slice(0, -1)) {
          const folderPath = [...parentPath, segment];
          const folderKey = folderPath.join(".");

          if (!folders.has(folderKey)) {
            folders.set(folderKey, { path: folderPath });
          }

          parentPath = folderPath;
        }

        const parentKey = parentPath.join(".");
        const siblingGroups = groupsByParent.get(parentKey) ?? [];
        siblingGroups.push(groupEntry);
        groupsByParent.set(parentKey, siblingGroups);
      }

      const getChildFolderEntries = (parentKey: string, pathLength: number) =>
        Array.from(folders.entries())
          .filter(([, folder]) => folder.path.length === pathLength && folder.path.slice(0, -1).join(".") === parentKey)
          .sort(([, left], [, right]) => left.path.at(-1)!.localeCompare(right.path.at(-1)!));

      const getChildGroupEntries = (
        parentKey: string,
        childFolders: [string, { path: string[] }][],
      ): [string, SidebarCustomResource[]][] => {
        const childFolderNames = new Set(childFolders.map(([, folder]) => folder.path.at(-1)!));

        return (groupsByParent.get(parentKey) ?? [])
          .filter(([group]) => !childFolderNames.has(getGroupLabel(group)))
          .sort(([left], [right]) => getGroupLabel(left).localeCompare(getGroupLabel(right)));
      };

      const getChildEntries = (parentKey: string, childFolderPathLength: number) => {
        const childFolders = getChildFolderEntries(parentKey, childFolderPathLength);
        const childGroups = getChildGroupEntries(parentKey, childFolders);

        return [
          ...childFolders.map(([key, folder]) => ({ key, title: folder.path.at(-1)!, kind: "folder" as const })),
          ...childGroups.map(([group]) => ({ key: group, title: getGroupLabel(group), kind: "group" as const })),
        ].sort((left, right) => left.title.localeCompare(right.title));
      };

      const folderItems = new Map<string, ReturnType<typeof toCustomResourceFolderSidebarItem>>();
      const registrations = [];
      const pathsByDepth = Array.from(folders.entries()).sort(
        ([, left], [, right]) =>
          left.path.length - right.path.length || left.path.join(".").localeCompare(right.path.join(".")),
      );

      for (const [folderKey, { path }] of pathsByDepth) {
        const parentPath = path.slice(0, -1);
        const parentKey = parentPath.join(".");
        const parentId = parentPath.length ? folderItems.get(parentKey)!.id : customResourcesSidebarItemInjectable.id;
        const siblingEntries = getChildEntries(parentKey, path.length);
        const orderNumber = siblingEntries.findIndex((entry) => entry.kind === "folder" && entry.key === folderKey);
        const folderItem = toCustomResourceFolderSidebarItem(path, orderNumber, parentId);
        folderItems.set(folderKey, folderItem);
        registrations.push(folderItem);
      }

      for (const [parentKey, groups] of groupsByParent) {
        const parentPath = parentKey ? parentKey.split(".") : [];
        const parentId = parentPath.length ? folderItems.get(parentKey)!.id : customResourcesSidebarItemInjectable.id;
        const siblingEntries = getChildEntries(parentKey, parentPath.length + 1);

        for (const [group, resources] of groups) {
          const groupLabel = getGroupLabel(group);
          const collidingEntry = siblingEntries.find((entry) => entry.kind === "folder" && entry.title === groupLabel);
          const collidesWithFolder = collidingEntry !== undefined;
          const title = collidesWithFolder ? group.replaceAll(".", "\u200b.") : groupLabel;
          const orderNumber = siblingEntries.findIndex((entry) => entry.kind === "group" && entry.key === group);
          const collidingFolderKey = parentKey ? `${parentKey}.${groupLabel}` : groupLabel;
          const collidingFolderItem = collidesWithFolder ? folderItems.get(collidingFolderKey) : undefined;

          if (collidingFolderItem) {
            const folderPathLength = collidingFolderKey.split(".").length;
            const childEntries = getChildEntries(collidingFolderKey, folderPathLength + 1);

            registrations.push(
              ...toCustomResourceGroupToSidebarItems(
                [group, resources],
                orderNumber,
                collidingFolderItem.id,
                title,
                false,
                childEntries.length,
              ),
            );
          } else {
            registrations.push(
              ...toCustomResourceGroupToSidebarItems([group, resources], orderNumber, parentId, title),
            );
          }
        }
      }

      return registrations;
    });
  },
});

export default customResourceDefinitionGroupsSidebarItemsComputedInjectable;
