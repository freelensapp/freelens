/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { computedAnd, noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import * as yaml from "js-yaml";
import { matches } from "lodash";
import { computed } from "mobx";
import customResourcesRouteInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/custom-resources-route.injectable";
import navigateToCustomResourcesInjectable from "../../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import { shouldShowResourceInjectionToken } from "../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import routePathParametersInjectable from "../../routes/route-path-parameters.injectable";
import customResourcesSidebarItemInjectable from "../custom-resources/sidebar-item.injectable";
import customResourceDefinitionsInjectable from "./definitions.injectable";

import type { SidebarItemRegistration } from "@freelensapp/cluster-sidebar";
import type { CustomResourceDefinition } from "@freelensapp/kube-object";

const titleCaseSplitRegex = /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

const formatResourceKind = (resourceKind: string) => resourceKind.split(titleCaseSplitRegex).join(" ");

interface GroupInfo {
  topLevel: string;
  subLevel: string | null;
}

interface GroupConfig {
  [topLevel: string]: string[] | { [subLevel: string]: string[] | null } | null;
}

// Structure to preserve the order of groups and subgroups from the YAML
interface OrderedGroupConfig {
  config: GroupConfig;
  topLevelOrder: string[];
  subLevelOrder: Record<string, string[]>;
}

/**
 * Safely parses configuration string in YAML format
 * @param configString Configuration string (YAML format)
 * @returns Parsed configuration with preserved order or null if invalid
 */
const parseGroupConfig = (configString: string): OrderedGroupConfig | null => {
  if (!configString || typeof configString !== "string" || configString.trim() === "") {
    return null;
  }

  try {
    // Parse YAML format
    const config = yaml.load(configString);

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return null;
    }

    // Preserve the order of top-level groups
    const topLevelOrder = Object.keys(config);
    const subLevelOrder: Record<string, string[]> = {};

    // Preserve the order of sub-levels for each top-level group
    topLevelOrder.forEach((topLevel) => {
      const topLevelConfig = (config as Record<string, any>)[topLevel];

      // Process only arrays and objects
      if (topLevelConfig && typeof topLevelConfig === "object" && !Array.isArray(topLevelConfig)) {
        // This is an object with direct sub-levels
        subLevelOrder[topLevel] = Object.keys(topLevelConfig);
      } else if (Array.isArray(topLevelConfig)) {
        // Extract the names of sub-levels from elements that are objects
        const subLevels: string[] = [];
        topLevelConfig.forEach((item) => {
          if (item && typeof item === "object") {
            subLevels.push(...Object.keys(item));
          }
        });
        if (subLevels.length > 0) {
          subLevelOrder[topLevel] = subLevels;
        }
      }
    });

    return {
      config: config as GroupConfig,
      topLevelOrder,
      subLevelOrder,
    };
  } catch (error) {
    console.warn(`Failed to parse CRD groups configuration: ${error}`);
    return null;
  }
};

/**
 * Checks if a CRD group matches a pattern based on substring comparison
 * @param crdGroup The CRD group to check
 * @param pattern The pattern to match against
 * @returns True if it matches, false otherwise
 */
const matchesGroupPattern = (crdGroup: string, pattern: string): boolean => {
  // Special case: empty pattern matches everything
  if (pattern === "") return true;

  // Special case: null pattern never matches
  if (pattern === null) return false;

  // Check if the CRD group contains the pattern as a substring
  return crdGroup.includes(pattern);
};

/**
 * Scores a pattern based on specificity - more dots = higher score
 * @param pattern The pattern to score
 * @returns The specificity score
 */
const getPatternSpecificity = (pattern: string): number => {
  if (!pattern) return 0;
  return (pattern.match(/\./g) || []).length;
};

/**
 * Find the best matching pattern for a CRD group
 * @param crdGroup The CRD group
 * @param patterns Array of patterns to check
 * @returns The best matching pattern or null if none matches
 */
const findBestMatch = (crdGroup: string, patterns: (string | null)[]): string | null => {
  if (!patterns || !patterns.length) return null;

  let bestMatch: string | null = null;
  let bestScore = -1;

  for (const pattern of patterns) {
    if (pattern === null) continue;

    if (matchesGroupPattern(crdGroup, pattern)) {
      const score = getPatternSpecificity(pattern);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }
  }

  return bestMatch;
};

/**
 * Determines the group placement for a CRD
 * @param group The original CRD group
 * @param configData The parsed configuration data
 * @returns The top level and sublevel for the CRD
 */
const getByNewGroup = (group: string, configData: OrderedGroupConfig): GroupInfo => {
  // Default result uses the original group
  const defaultResult = { topLevel: group, subLevel: null };

  if (!configData) {
    return defaultResult;
  }

  const configObj = configData.config;

  // Prepare match candidates - maps pattern to [topLevel, subLevel]
  type MatchCandidate = [string, string | null];
  const candidates: [string, MatchCandidate][] = [];

  // Process all patterns from the config
  for (const topLevel of Object.keys(configObj)) {
    const topLevelConfig = configObj[topLevel];

    // Handle null config - skip this entry
    if (topLevelConfig === null) continue;

    // Handle array config - direct patterns at top level
    if (Array.isArray(topLevelConfig)) {
      for (const item of topLevelConfig) {
        if (typeof item === "string") {
          // Simple case - a direct string
          candidates.push([item, [topLevel, null]]);
        } else if (typeof item === "object" && item !== null) {
          // Case where a array element is an object (sub-level)
          for (const subLevel of Object.keys(item)) {
            const subGroups = item[subLevel];

            // Ignore null sub-levels
            if (subGroups === null) continue;

            // Process pattern arrays in the sub-level
            if (Array.isArray(subGroups)) {
              const patterns = subGroups as any[];
              for (const pattern of patterns) {
                if (typeof pattern === "string") {
                  candidates.push([pattern, [topLevel, subLevel]]);
                }
              }
            }
          }
        }
      }
      continue;
    }

    // Handle object config - patterns in sublevels directly in top level
    if (typeof topLevelConfig === "object") {
      for (const subLevel of Object.keys(topLevelConfig)) {
        const subGroups = topLevelConfig[subLevel];

        // Handle null sublevel - skip this entry
        if (subGroups === null) continue;

        // Handle array of patterns in sublevel
        if (Array.isArray(subGroups)) {
          const patterns = subGroups as any[];
          for (const pattern of patterns) {
            if (typeof pattern === "string") {
              candidates.push([pattern, [topLevel, subLevel]]);
            }
          }
        }
      }
    }
  }

  // Find the best match from candidates
  const bestPattern = findBestMatch(
    group,
    candidates.map(([pattern]) => pattern),
  );
  if (bestPattern !== null) {
    const [topLevel, subLevel] = candidates.find(([pattern]) => pattern === bestPattern)![1];
    return { topLevel, subLevel };
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
        const { structure, topLevelOrder, subLevelOrder } = organizeCrdsIntoGroups(
          customResourceDefinitions.get().values(),
          state.crdGroup || "", // Provide an empty string by default if crdGroup is undefined
        );

        // Generate sidebar items from structure
        return generateSidebarItems(structure, topLevelOrder, subLevelOrder, {
          navigateToCustomResources,
          customResourcesRoute,
          pathParameters,
        });
      } catch (error) {
        console.error("Error generating sidebar items:", error);
        return [];
      }
    });
  },
});

/**
 * Gets the fully-qualified resource name for a CRD
 * @param crd CustomResourceDefinition
 * @returns Fully qualified resource name in format: pluralized-name.group
 */
const getFullyQualifiedResourceName = (crd: CustomResourceDefinition): string => {
  return `${crd.getPluralName()}.${crd.getGroup()}`;
};

/**
 * Organizes CRDs into a hierarchical structure by top and sublevels
 * and preserves the order from the YAML configuration
 */
function organizeCrdsIntoGroups(
  crds: Iterable<CustomResourceDefinition>,
  configYaml: string,
): {
  structure: Record<string, Record<string, CustomResourceDefinition[]>>;
  topLevelOrder: string[];
  subLevelOrder: Record<string, string[]>;
} {
  const structure: Record<string, Record<string, CustomResourceDefinition[]>> = {};

  // Parse configuration to get the ordered structure
  const parsedConfig = parseGroupConfig(configYaml);
  const topLevelOrder = parsedConfig?.topLevelOrder || [];
  const subLevelOrder = parsedConfig?.subLevelOrder || {};

  for (const crd of crds) {
    try {
      // Use the full qualified name for matching
      const fullName = getFullyQualifiedResourceName(crd);
      // If parsedConfig is null, use an empty object by default
      const { topLevel, subLevel } = parsedConfig
        ? getByNewGroup(fullName, parsedConfig)
        : { topLevel: fullName, subLevel: null };

      // If null was specified for this top level, skip it entirely
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

  return {
    structure,
    topLevelOrder,
    subLevelOrder,
  };
}

/**
 * Generates sidebar items from the CRD structure
 */
function generateSidebarItems(
  structure: Record<string, Record<string, CustomResourceDefinition[]>>,
  topLevelOrder: string[],
  subLevelOrder: Record<string, string[]>,
  options: {
    navigateToCustomResources: any;
    customResourcesRoute: any;
    pathParameters: any;
  },
): any[] {
  const result: any[] = [];

  // Process each top level group using the order from config
  const effectiveTopLevelOrder = topLevelOrder.length > 0 ? topLevelOrder : Object.keys(structure);

  effectiveTopLevelOrder
    .filter((topLevelName) => structure[topLevelName]) // Only process groups that exist in structure
    .forEach((topLevelName, topLevelIndex) => {
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
                ...options,
              }),
            );

            result.push(...directItems);
          } catch (error) {
            console.error("Error creating direct CRD items:", error);
          }
        }

        // Process sublevels using the order from config
        const availableSubLevels = Object.keys(structure[topLevelName]).filter((key) => key !== "direct");
        const orderedSubLevels = subLevelOrder[topLevelName] || [];

        // Use ordered sublevels if available, otherwise use default order
        const subLevelsToProcess =
          orderedSubLevels.length > 0
            ? orderedSubLevels.filter((key) => availableSubLevels.includes(key))
            : availableSubLevels;

        subLevelsToProcess.forEach((subLevelKey, subLevelIndex) => {
          try {
            const subLevelName = subLevelKey;
            const subLevelCrds = structure[topLevelName][subLevelKey];

            // Skip if no CRDs in this sublevel
            if (!subLevelCrds || subLevelCrds.length === 0) {
              return;
            }

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
                ...options,
              }),
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
