/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { computedAnd, iter, noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { matches } from "es-toolkit/compat";
import * as yaml from "js-yaml";
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

export const sideBarItemCustomResourcePrefix = "sidebar-item-custom-resource-group";

// ===============================
// INTERFACES POUR GROUPES CRD
// ===============================

interface ConfigNode {
  name: string;
  patterns: string[];
  children: ConfigNode[];
  order: number;
}

interface GroupPath {
  path: string[];
}

interface ParsedConfig {
  nodes: ConfigNode[];
}

interface PatternCandidate {
  pattern: string;
  path: string[];
  specificity: number;
}

// ===============================
// PARSING YAML CONFIG
// ===============================

function parseItemsRecursively(items: any[], startOrder: number = 0): ConfigNode[] {
  const nodes: ConfigNode[] = [];
  let currentOrder = startOrder;
  for (const item of items) {
    if (typeof item === "string") continue;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const [name, value] of Object.entries(item)) {
        const node: ConfigNode = { name, patterns: [], children: [], order: currentOrder++ };
        if (value === null) continue;
        if (Array.isArray(value)) {
          for (const subItem of value) {
            if (typeof subItem === "string") node.patterns.push(subItem);
            else if (subItem && typeof subItem === "object") node.children.push(...parseItemsRecursively([subItem], 0));
          }
        }
        nodes.push(node);
      }
    }
  }
  return nodes;
}

function parseGroupConfig(configString: string): ParsedConfig | null {
  if (!configString || typeof configString !== "string" || configString.trim() === "") return null;
  try {
    const config = yaml.load(configString);
    if (!config || typeof config !== "object" || Array.isArray(config)) return null;
    const nodes: ConfigNode[] = [];
    let order = 0;
    for (const [topLevelName, topLevelValue] of Object.entries(config as Record<string, any>)) {
      if (topLevelValue === null) continue;
      const node: ConfigNode = { name: topLevelName, patterns: [], children: [], order: order++ };
      if (Array.isArray(topLevelValue)) {
        for (const item of topLevelValue) {
          if (typeof item === "string") node.patterns.push(item);
          else if (item && typeof item === "object")
            node.children.push(...parseItemsRecursively([item], node.children.length));
        }
      } else if (typeof topLevelValue === "object") {
        for (const [subName, subValue] of Object.entries(topLevelValue)) {
          const childNode: ConfigNode = { name: subName, patterns: [], children: [], order: node.children.length };
          if (Array.isArray(subValue)) {
            for (const item of subValue) {
              if (typeof item === "string") childNode.patterns.push(item);
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

// ===============================
// PATTERN MATCHING
// ===============================

function matchesPattern(crdName: string, pattern: string): boolean {
  if (pattern === "") return true;
  if (pattern === null) return false;
  return crdName.includes(pattern);
}

function getPatternSpecificity(pattern: string): number {
  if (!pattern) return 0;
  return (pattern.match(/\./g) || []).length;
}

function collectPatternCandidates(nodes: ConfigNode[], currentPath: string[] = []): PatternCandidate[] {
  const candidates: PatternCandidate[] = [];
  for (const node of nodes) {
    const nodePath = [...currentPath, node.name];
    for (const pattern of node.patterns) {
      candidates.push({ pattern, path: nodePath, specificity: getPatternSpecificity(pattern) });
    }
    if (node.children.length > 0) candidates.push(...collectPatternCandidates(node.children, nodePath));
  }
  return candidates;
}

function findGroupPath(crdName: string, config: ParsedConfig | null): GroupPath | null {
  if (!config || !config.nodes.length) return null;
  const candidates = collectPatternCandidates(config.nodes);
  const matches = candidates.filter((c) => matchesPattern(crdName, c.pattern));
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    return b.path.length - a.path.length;
  });
  return { path: matches[0].path };
}

// ===============================
// ORGANISATION DES CRD EN ARBRE
// ===============================

interface CrdTreeNode {
  name: string;
  crds: CustomResourceDefinition[];
  children: Map<string, CrdTreeNode>;
  order: number;
}

function createCrdTreeNode(name: string, order: number = 0): CrdTreeNode {
  return { name, crds: [], children: new Map(), order };
}

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

function organizeCrdsIntoTree(
  crds: Iterable<CustomResourceDefinition>,
  configYaml: string,
): { root: CrdTreeNode; config: ParsedConfig | null; ungrouped: CustomResourceDefinition[] } {
  const config = parseGroupConfig(configYaml);
  const root = createCrdTreeNode("root", 0);
  const ungrouped: CustomResourceDefinition[] = [];
  for (const crd of crds) {
    try {
      const fullName = `${crd.getPluralName()}.${crd.getGroup()}`;
      const groupPath = findGroupPath(fullName, config);
      if (!groupPath) {
        ungrouped.push(crd);
        continue;
      }
      const { path } = groupPath;
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
  return { root, config, ungrouped };
}

// ===============================
// GENERATION DES ITEMS SIDEBAR
// ===============================

interface SidebarItemDependencies {
  navigateToCustomResources: any;
  customResourcesRoute: any;
  pathParameters: any;
}

function createCrdSidebarItem({
  id,
  parentId,
  definition,
  itemIndex,
  navigateToCustomResources,
  customResourcesRoute,
  pathParameters,
}: SidebarItemDependencies & {
  id: string;
  parentId: string;
  definition: CustomResourceDefinition;
  itemIndex: number;
}): any {
  const parameters = {
    group: definition.getGroup(),
    name: definition.getPluralName(),
  };
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

function generateSidebarItemsRecursive(
  node: CrdTreeNode,
  parentId: string,
  pathSegments: string[],
  options: SidebarItemDependencies,
): any[] {
  const result: any[] = [];
  const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });
  for (const child of sortedChildren) {
    const childPath = [...pathSegments, child.name];
    const childPathId = childPath.join("-");
    const groupItem = getInjectable({
      id: `${sideBarItemCustomResourcePrefix}-${childPathId}`,
      instantiate: (): SidebarItemRegistration => ({
        parentId,
        onClick: noop,
        title: child.name.replaceAll(".", "\u200b."),
        orderNumber: child.order,
      }),
      injectionToken: sidebarItemInjectionToken,
    });
    result.push(groupItem);
    const sortedCrds = [...child.crds].sort((a, b) => a.getResourceKind().localeCompare(b.getResourceKind()));
    for (let i = 0; i < sortedCrds.length; i++) {
      const definition = sortedCrds[i];
      result.push(
        createCrdSidebarItem({
          id: `${sideBarItemCustomResourcePrefix}-${childPathId}/${definition.getPluralName()}`,
          parentId: groupItem.id,
          definition,
          itemIndex: i,
          ...options,
        }),
      );
    }
    if (child.children.size > 0) {
      const childItems = generateSidebarItemsRecursive(child, groupItem.id, childPath, options);
      result.push(...childItems);
    }
  }
  return result;
}

// ===============================
// SIDEBAR ITEMS PER API GROUP
// ===============================

// CRDs that no configured pattern matches keep the flat, one-item-per-API-group
// layout, with the same item ids, titles and ordering as when no grouping
// configuration exists at all.
function generateApiGroupSidebarItems(
  definitions: CustomResourceDefinition[],
  options: SidebarItemDependencies,
): any[] {
  const customResourceDefinitionGroups = iter
    .chain(definitions.values())
    .map((crd) => [crd.getGroup(), crd] as const)
    .toMap();

  return Array.from(customResourceDefinitionGroups.entries(), ([group, groupDefinitions], index) => {
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
    const customResourceSidebarItems = groupDefinitions.map((definition, itemIndex) =>
      createCrdSidebarItem({
        id: `${sideBarItemCustomResourcePrefix}-${group}/${definition.getPluralName()}`,
        parentId: customResourceGroupSidebarItem.id,
        definition,
        itemIndex,
        ...options,
      }),
    );

    return [customResourceGroupSidebarItem, ...customResourceSidebarItems];
  }).flat();
}

const titleCaseSplitRegex = /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

const formatResourceKind = (resourceKind: string) => resourceKind.split(titleCaseSplitRegex).join(" ");

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
        const crdList = customResourceDefinitions.get();
        const options = { navigateToCustomResources, customResourcesRoute, pathParameters };
        // Without a grouping configuration nothing matches, every CRD ends up in
        // `ungrouped` and the sidebar is exactly the one built before this feature.
        const { root, ungrouped } = organizeCrdsIntoTree(crdList, state.crdGroup ?? "");

        return [
          ...generateSidebarItemsRecursive(root, customResourcesSidebarItemInjectable.id, [], options),
          ...generateApiGroupSidebarItems(ungrouped, options),
        ];
      } catch (error) {
        console.error("Error generating sidebar items:", error);
        return [];
      }
    });
  },
});

export {
  collectPatternCandidates,
  findGroupPath,
  getPatternSpecificity,
  matchesPattern,
  organizeCrdsIntoTree,
  parseGroupConfig,
};

export type { ConfigNode, CrdTreeNode, GroupPath, ParsedConfig, PatternCandidate };

export default customResourceDefinitionGroupsSidebarItemsComputedInjectable;
