/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SidebarItemRegistration } from "@freelensapp/cluster-sidebar";
import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import type { CustomResourceDefinition } from "@freelensapp/kube-object";
import { computedAnd, noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { matches } from "lodash";
import { computed } from "mobx";
import customResourcesRouteInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/custom-resources-route.injectable";
import navigateToCustomResourcesInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import { shouldShowResourceInjectionToken } from "../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import routePathParametersInjectable from "../../routes/route-path-parameters.injectable";
import customResourcesSidebarItemInjectable from "../custom-resources/sidebar-item.injectable";
import customResourceDefinitionsInjectable from "./definitions.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

const titleCaseSplitRegex = /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

const formatResourceKind = (resourceKind: string) => resourceKind.split(titleCaseSplitRegex).join(" ");

interface GroupInfo {
  topLevel: string;
  subLevel: string | null;
}

interface GroupConfig {
  [topLevel: string]: (string | { [subLevel: string]: string[] })[];
}

/**
 * Safely parses JSON configuration string
 * @param configJson JSON configuration string
 * @returns Parsed configuration or null if invalid
 */
const parseGroupConfig = (configJson: string): GroupConfig | null => {
  if (!configJson || typeof configJson !== 'string' || configJson.trim() === '') {
    return null;
  }

  try {
    const config = JSON.parse(configJson);
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return null;
    }
    return config;
  } catch {
    return null;
  }
};

/**
 * Determines the group placement for a CRD
 * @param group The original CRD group
 * @param configJson The JSON configuration string for CRD groups
 * @returns The top level and sublevel for the CRD
 */
const getByNewGroup = (group: string, configJson: string): GroupInfo => {
  // Default result uses the original group
  const defaultResult = { topLevel: group, subLevel: null };
  
  // Parse configuration
  const config = parseGroupConfig(configJson);
  if (!config) return defaultResult;
  
  // Search in configuration
  for (const topLevel of Object.keys(config)) {
    const topLevelConfig = config[topLevel];
    
    // Skip invalid configurations
    if (!Array.isArray(topLevelConfig)) continue;
    
    // Check for direct match in top level
    if (topLevelConfig.includes(group)) {
      return { topLevel, subLevel: null };
    }
    
    // Check subgroups
    for (const item of topLevelConfig) {
      if (typeof item === 'object' && !Array.isArray(item)) {
        for (const subLevel of Object.keys(item)) {
          const subGroups = item[subLevel];
          if (Array.isArray(subGroups) && subGroups.includes(group)) {
            return { topLevel, subLevel };
          }
        }
      }
    }
  }
  
  return defaultResult;
};

/**
 * Creates a sidebar item for a CRD
 */
const createCrdSidebarItem = ({
  parentId,
  definition,
  topLevelName,
  subLevelName = null,
  itemIndex,
  navigateToCustomResources,
  customResourcesRoute,
  pathParameters,
}: {
  parentId: string;
  definition: CustomResourceDefinition;
  topLevelName: string;
  subLevelName?: string | null;
  itemIndex: number;
  navigateToCustomResources: any;
  customResourcesRoute: any;
  pathParameters: any;
}): any => {
  const parameters = {
    group: definition.getGroup(),
    name: definition.getPluralName(),
  };
  
  const idPrefix = subLevelName
    ? `sidebar-item-custom-resource-subgroup-${topLevelName}-${subLevelName}`
    : `sidebar-item-custom-resource-group-${topLevelName}`;
  
  return getInjectable({
    id: `${idPrefix}/${definition.getPluralName()}`,
    instantiate: (di): SidebarItemRegistration => ({
      parentId,
      onClick: () => navigateToCustomResources(parameters),
      title: formatResourceKind(definition.getResourceKind()),
      isActive: computedAnd(
        di.inject(routeIsActiveInjectable, customResourcesRoute),
        computed(() => matches(parameters)(pathParameters.get())),
      ),
      isVisible: di.inject(shouldShowResourceInjectionToken, {
        group: definition.getGroup(),
        apiName: definition.getPluralName(),
      }),
      orderNumber: itemIndex,
    }),
    injectionToken: sidebarItemInjectionToken,
  });
};

const customResourceDefinitionGroupsSidebarItemsComputedInjectable = getInjectable({
  id: "custom-resource-definition-groups-sidebar-items-computed",
  instantiate: (di) => {
    const customResourceDefinitions = di.inject(customResourceDefinitionsInjectable);
    const navigateToCustomResources = di.inject(navigateToCustomResourcesInjectable);
    const customResourcesRoute = di.inject(customResourcesRouteInjectable);
    const pathParameters = di.inject(routePathParametersInjectable, customResourcesRoute);
    const state = di.inject(userPreferencesStateInjectable);
      return computed(() => {
      try {
        // Organize CRDs into structure: { topLevel: { subLevel: [CRDs] } }
        const structure = organizeCrdsIntoGroups(
          customResourceDefinitions.get().values(), 
          state.crdGroup || "" // Fournir une chaîne vide par défaut si crdGroup est undefined
        );
        
        // Generate sidebar items from structure
        return generateSidebarItems(structure, {
          navigateToCustomResources,
          customResourcesRoute,
          pathParameters
        });
      } catch (error) {
        console.error("Error generating sidebar items:", error);
        return [];
      }
    });
  },
});

/**
 * Organizes CRDs into a hierarchical structure by top and sublevels
 */
function organizeCrdsIntoGroups(
  crds: Iterable<CustomResourceDefinition>,
  configJson: string
): Record<string, Record<string, CustomResourceDefinition[]>> {
  const structure: Record<string, Record<string, CustomResourceDefinition[]>> = {};
  
  for (const crd of crds) {
    try {
      const { topLevel, subLevel } = getByNewGroup(crd.getGroup(), configJson);
      if (!topLevel) continue;
      
      const subLevelKey = subLevel || "direct";
      
      // Initialize structure if needed
      if (!structure[topLevel]) {
        structure[topLevel] = {};
      }
      if (!structure[topLevel][subLevelKey]) {
        structure[topLevel][subLevelKey] = [];
      }
      
      structure[topLevel][subLevelKey].push(crd);
    } catch (error) {
      console.error("Error processing CRD:", error);
    }
  }
  
  return structure;
}

/**
 * Generates sidebar items from the CRD structure
 */
function generateSidebarItems(
  structure: Record<string, Record<string, CustomResourceDefinition[]>>,
  options: { 
    navigateToCustomResources: any;
    customResourcesRoute: any;
    pathParameters: any;
  }
): any[] {
  const result: any[] = [];
  
  // Process each top level group
  Object.keys(structure).forEach((topLevelName, topLevelIndex) => {
    try {
      // Create top level item
      const topLevelItem = getInjectable({
        id: `sidebar-item-custom-resource-group-${topLevelName}`,
        instantiate: (): SidebarItemRegistration => ({
          parentId: customResourcesSidebarItemInjectable.id,
          onClick: noop,
          title: topLevelName.replaceAll(".", "\u200b."), // Add zero-width spaces to allow breaks
          orderNumber: topLevelIndex + 1,
        }),
        injectionToken: sidebarItemInjectionToken,
      });
      
      result.push(topLevelItem);
      
      // Process direct CRDs (without sublevel)
      const directCrds = structure[topLevelName]["direct"] || [];
      if (directCrds.length > 0) {
        try {
          const directItems = directCrds.map((definition, itemIndex) =>
            createCrdSidebarItem({
              parentId: topLevelItem.id,
              definition,
              topLevelName,
              itemIndex,
              ...options
            })
          );
          
          result.push(...directItems);
        } catch (error) {
          console.error("Error creating direct CRD items:", error);
        }
      }
      
      // Process sublevels
      Object.keys(structure[topLevelName])
        .filter(key => key !== "direct")
        .forEach((subLevelKey, subLevelIndex) => {
          try {
            const subLevelName = subLevelKey;
            const subLevelCrds = structure[topLevelName][subLevelKey];
            
            // Create sublevel item
            const subLevelItem = getInjectable({
              id: `sidebar-item-custom-resource-subgroup-${topLevelName}-${subLevelName}`,
              instantiate: (): SidebarItemRegistration => ({
                parentId: topLevelItem.id,
                onClick: noop,
                title: subLevelName.replaceAll(".", "\u200b."),
                orderNumber: subLevelIndex + 1,
              }),
              injectionToken: sidebarItemInjectionToken,
            });
            
            result.push(subLevelItem);
            
            // Create items for CRDs in sublevel
            const subLevelItems = subLevelCrds.map((definition, itemIndex) =>
              createCrdSidebarItem({
                parentId: subLevelItem.id,
                definition,
                topLevelName,
                subLevelName,
                itemIndex,
                ...options
              })
            );
            
            result.push(...subLevelItems);
          } catch (error) {
            console.error(`Error processing sublevel "${subLevelKey}":`, error);
          }
        });
    } catch (error) {
      console.error(`Error processing top level "${topLevelName}":`, error);
    }
  });
  
  return result;
}

export default customResourceDefinitionGroupsSidebarItemsComputedInjectable;
