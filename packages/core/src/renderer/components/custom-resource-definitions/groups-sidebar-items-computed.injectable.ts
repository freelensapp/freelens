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

// ============================================================================
// NEW INTERFACES FOR N-LEVEL HIERARCHY SUPPORT
// ============================================================================

/**
 * Represents a node in the configuration tree
 * Supports arbitrary depth of nesting
 */
interface ConfigNode {
  name: string;
  patterns: string[]; // Direct patterns at this level
  children: ConfigNode[]; // Child nodes (sub-groups)
  order: number; // Order in which this node appears
}

/**
 * Represents the full path to a group in the hierarchy
 * e.g., ["GitOps", "FluxCD", "Image Policies"]
 */
interface GroupPath {
  path: string[];
}

/**
 * Represents the parsed configuration with the tree structure
 */
interface ParsedConfig {
  nodes: ConfigNode[];
}

/**
 * Represents a pattern match candidate with its full path
 */
interface PatternCandidate {
  pattern: string;
  path: string[];
  specificity: number;
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Recursively parses YAML configuration into a tree of ConfigNodes
 * Supports arbitrary nesting depth
 *
 * @param items Array of items (can be strings or objects)
 * @param startOrder Starting order number for siblings
 * @returns Array of ConfigNode
 */
function parseItemsRecursively(items: any[], startOrder: number = 0): ConfigNode[] {
  const nodes: ConfigNode[] = [];
  let currentOrder = startOrder;

  for (const item of items) {
    if (typeof item === "string") {
      // Skip string patterns at this level - they are handled by the parent
      continue;
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
      // This is an object representing a sub-group
      for (const [name, value] of Object.entries(item)) {
        const node: ConfigNode = {
          name,
          patterns: [],
          children: [],
          order: currentOrder++,
        };

        if (value === null) {
          // Null means this group should be hidden/skipped
          continue;
        }

        if (Array.isArray(value)) {
          // Extract direct patterns (strings) and recurse for children (objects)
          for (const subItem of value) {
            if (typeof subItem === "string") {
              node.patterns.push(subItem);
            } else if (subItem && typeof subItem === "object") {
              // Recursively parse nested objects
              const childNodes = parseItemsRecursively([subItem], 0);
              node.children.push(...childNodes);
            }
          }
        }

        nodes.push(node);
      }
    }
  }

  return nodes;
}

/**
 * Parses the top-level YAML configuration
 * @param configString YAML configuration string
 * @returns ParsedConfig with tree structure or null if invalid
 */
function parseGroupConfig(configString: string): ParsedConfig | null {
  if (!configString || typeof configString !== "string" || configString.trim() === "") {
    return null;
  }

  try {
    const config = yaml.load(configString);

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return null;
    }

    const nodes: ConfigNode[] = [];
    let order = 0;

    for (const [topLevelName, topLevelValue] of Object.entries(config as Record<string, any>)) {
      if (topLevelValue === null) {
        // Skip hidden groups
        continue;
      }

      const node: ConfigNode = {
        name: topLevelName,
        patterns: [],
        children: [],
        order: order++,
      };

      if (Array.isArray(topLevelValue)) {
        // Process array items
        for (const item of topLevelValue) {
          if (typeof item === "string") {
            node.patterns.push(item);
          } else if (item && typeof item === "object") {
            const childNodes = parseItemsRecursively([item], node.children.length);
            node.children.push(...childNodes);
          }
        }
      } else if (typeof topLevelValue === "object") {
        // Direct object notation (less common)
        for (const [subName, subValue] of Object.entries(topLevelValue)) {
          const childNode: ConfigNode = {
            name: subName,
            patterns: [],
            children: [],
            order: node.children.length,
          };

          if (Array.isArray(subValue)) {
            for (const item of subValue) {
              if (typeof item === "string") {
                childNode.patterns.push(item);
              }
            }
          }

          node.children.push(childNode);
        }
      }

      nodes.push(node);
    }

    return { nodes };
  } catch (error) {
    console.warn(`Failed to parse CRD groups configuration: ${error}`);
    return null;
  }
}

// ============================================================================
// PATTERN MATCHING FUNCTIONS
// ============================================================================

/**
 * Checks if a CRD name matches a pattern
 * @param crdName The CRD name to check
 * @param pattern The pattern to match against
 * @returns True if it matches
 */
function matchesPattern(crdName: string, pattern: string): boolean {
  if (pattern === "") return true; // Empty pattern matches everything
  if (pattern === null) return false;
  return crdName.includes(pattern);
}

/**
 * Calculates pattern specificity (more dots = more specific)
 * @param pattern The pattern to score
 * @returns Specificity score
 */
function getPatternSpecificity(pattern: string): number {
  if (!pattern) return 0;
  return (pattern.match(/\./g) || []).length;
}

/**
 * Recursively collects all pattern candidates from the config tree
 * @param nodes Array of ConfigNodes to process
 * @param currentPath Current path in the tree
 * @returns Array of PatternCandidate
 */
function collectPatternCandidates(nodes: ConfigNode[], currentPath: string[] = []): PatternCandidate[] {
  const candidates: PatternCandidate[] = [];

  for (const node of nodes) {
    const nodePath = [...currentPath, node.name];

    // Add patterns at this level
    for (const pattern of node.patterns) {
      candidates.push({
        pattern,
        path: nodePath,
        specificity: getPatternSpecificity(pattern),
      });
    }

    // Recurse into children
    if (node.children.length > 0) {
      const childCandidates = collectPatternCandidates(node.children, nodePath);
      candidates.push(...childCandidates);
    }
  }

  return candidates;
}

/**
 * Finds the best matching group path for a CRD
 * @param crdName The fully qualified CRD name
 * @param config The parsed configuration
 * @returns GroupPath with the full path, or a default path
 */
function findGroupPath(crdName: string, config: ParsedConfig | null): GroupPath {
  const defaultPath: GroupPath = { path: [crdName] };

  if (!config || !config.nodes.length) {
    return defaultPath;
  }

  const candidates = collectPatternCandidates(config.nodes);

  // Find all matching candidates
  const matches = candidates.filter((c) => matchesPattern(crdName, c.pattern));

  if (matches.length === 0) {
    return defaultPath;
  }

  // Sort by specificity (highest first), then by path length (prefer more specific paths)
  matches.sort((a, b) => {
    if (b.specificity !== a.specificity) {
      return b.specificity - a.specificity;
    }
    return b.path.length - a.path.length;
  });

  return { path: matches[0].path };
}

// ============================================================================
// CRD ORGANIZATION
// ============================================================================

/**
 * Tree node for storing CRDs in a hierarchical structure
 */
interface CrdTreeNode {
  name: string;
  crds: CustomResourceDefinition[];
  children: Map<string, CrdTreeNode>;
  order: number;
}

/**
 * Creates an empty CRD tree node
 */
function createCrdTreeNode(name: string, order: number = 0): CrdTreeNode {
  return {
    name,
    crds: [],
    children: new Map(),
    order,
  };
}

/**
 * Gets the order for a node at a specific path from the config
 */
function getNodeOrder(config: ParsedConfig | null, path: string[]): number {
  if (!config || path.length === 0) return 999;

  let nodes = config.nodes;
  let order = 999;

  for (let i = 0; i < path.length; i++) {
    const nodeName = path[i];
    const node = nodes.find((n) => n.name === nodeName);

    if (node) {
      order = node.order;
      nodes = node.children;
    } else {
      break;
    }
  }

  return order;
}

/**
 * Organizes CRDs into a tree structure based on the configuration
 * @param crds Iterable of CRDs
 * @param configYaml YAML configuration string
 * @returns Root CrdTreeNode containing all organized CRDs
 */
function organizeCrdsIntoTree(
  crds: Iterable<CustomResourceDefinition>,
  configYaml: string,
): { root: CrdTreeNode; config: ParsedConfig | null } {
  const config = parseGroupConfig(configYaml);
  const root = createCrdTreeNode("root", 0);

  for (const crd of crds) {
    try {
      const fullName = `${crd.getPluralName()}.${crd.getGroup()}`;
      const { path } = findGroupPath(fullName, config);

      // Navigate/create the tree path and add the CRD at the end
      let currentNode = root;

      for (let i = 0; i < path.length; i++) {
        const segment = path[i];

        if (!currentNode.children.has(segment)) {
          const order = getNodeOrder(config, path.slice(0, i + 1));
          currentNode.children.set(segment, createCrdTreeNode(segment, order));
        }

        currentNode = currentNode.children.get(segment)!;
      }

      currentNode.crds.push(crd);
    } catch (error) {
      console.error("Error processing CRD:", error);
    }
  }

  return { root, config };
}

// ============================================================================
// SIDEBAR GENERATION
// ============================================================================

/**
 * Creates a sidebar item for a CRD resource
 */
function createCrdSidebarItem({
  parentId,
  definition,
  pathSegments,
  itemIndex,
  navigateToCustomResources,
  customResourcesRoute,
  pathParameters,
}: {
  parentId: string;
  definition: CustomResourceDefinition;
  pathSegments: string[];
  itemIndex: number;
  navigateToCustomResources: any;
  customResourcesRoute: any;
  pathParameters: any;
}): any {
  const parameters = {
    group: definition.getGroup(),
    name: definition.getPluralName(),
  };

  // Create a unique ID based on the full path (keeping backward compatible format)
  const pathId = pathSegments.join("-");
  const id = `sidebar-item-custom-resource-group-${pathId}/${definition.getPluralName()}`;

  return getInjectable({
    id,
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
}

/**
 * Recursively generates sidebar items from the CRD tree
 * @param node Current tree node
 * @param parentId Parent sidebar item ID
 * @param pathSegments Path segments to this node
 * @param options Sidebar options
 * @returns Array of injectable sidebar items
 */
function generateSidebarItemsRecursive(
  node: CrdTreeNode,
  parentId: string,
  pathSegments: string[],
  options: {
    navigateToCustomResources: any;
    customResourcesRoute: any;
    pathParameters: any;
  },
): any[] {
  const result: any[] = [];

  // Sort children by order, then by name
  const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });

  for (const child of sortedChildren) {
    const childPath = [...pathSegments, child.name];
    const childPathId = childPath.join("-");

    // Create the group item (keeping backward compatible ID format)
    const groupItem = getInjectable({
      id: `sidebar-item-custom-resource-group-${childPathId}`,
      instantiate: (): SidebarItemRegistration => ({
        parentId,
        onClick: noop,
        title: child.name.replaceAll(".", "\u200b."), // Add zero-width spaces for line breaks
        orderNumber: child.order,
      }),
      injectionToken: sidebarItemInjectionToken,
    });

    result.push(groupItem);

    // Add direct CRDs at this level
    const sortedCrds = [...child.crds].sort((a, b) => a.getResourceKind().localeCompare(b.getResourceKind()));

    for (let i = 0; i < sortedCrds.length; i++) {
      result.push(
        createCrdSidebarItem({
          parentId: groupItem.id,
          definition: sortedCrds[i],
          pathSegments: childPath,
          itemIndex: i,
          ...options,
        }),
      );
    }

    // Recursively process children
    if (child.children.size > 0) {
      const childItems = generateSidebarItemsRecursive(child, groupItem.id, childPath, options);
      result.push(...childItems);
    }
  }

  return result;
}

// ============================================================================
// MAIN INJECTABLE
// ============================================================================

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
        // Organize CRDs into a tree structure
        const { root } = organizeCrdsIntoTree(customResourceDefinitions.get().values(), state.crdGroup || "");

        // Generate sidebar items recursively from the tree
        return generateSidebarItemsRecursive(root, customResourcesSidebarItemInjectable.id, [], {
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

export default customResourceDefinitionGroupsSidebarItemsComputedInjectable;

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export {
  parseGroupConfig,
  findGroupPath,
  organizeCrdsIntoTree,
  collectPatternCandidates,
  matchesPattern,
  getPatternSpecificity,
};

export type { ConfigNode, GroupPath, ParsedConfig, PatternCandidate, CrdTreeNode };
