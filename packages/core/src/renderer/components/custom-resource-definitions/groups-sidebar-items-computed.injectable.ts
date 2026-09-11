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

// A "-" in a group name would otherwise be indistinguishable from the "-" used
// to join path segments below (nested groups ["Cluster","API"] and a flat group
// literally named "Cluster-API" would both produce "Cluster-API"). Escaping "\"
// first, then "-", guarantees every "-" left in the joined string is a real
// segment separator, not part of a name.
function encodeGroupPathSegment(segment: string): string {
  return segment.replace(/\\/g, "\\\\").replace(/-/g, "\\-");
}

function buildGroupPathId(path: string[]): string {
  return path.map(encodeGroupPathSegment).join("-");
}

// ===============================
// CRD GROUP INTERFACES
// ===============================

interface ConfigNode {
  name: string;
  patterns: string[];
  children: ConfigNode[];
  // A null-configured direct sub-entry, kept out of `children` (so visible
  // structure/order/counts are unaffected) but still carrying an implicit
  // catch-all pattern, so CRDs that would only match through it are still
  // routed here and then dropped (see `organizeCrdsIntoTree`) instead of
  // falling back to the flat/ungrouped list. Optional (and omitted rather than
  // set to `[]`/`false` on tombstones) so existing object literals/assertions
  // that predate this field keep compiling and passing.
  hiddenChildren?: ConfigNode[];
  order: number;
  hidden?: boolean;
}

interface GroupPath {
  path: string[];
  hidden?: boolean;
}

interface ParsedConfig {
  nodes: ConfigNode[];
  // Optional/omitted (not `[]`) so existing `ParsedConfig` literals and `toEqual`
  // assertions that predate hidden-group support keep compiling and passing.
  hiddenNodes?: ConfigNode[];
}

interface PatternCandidate {
  pattern: string;
  path: string[];
  specificity: number;
  hidden?: boolean;
}

// ===============================
// PARSING YAML CONFIG
// ===============================

function parseItemsRecursively(
  items: any[],
  startOrder: number = 0,
): { nodes: ConfigNode[]; hiddenNodes: ConfigNode[] } {
  const nodes: ConfigNode[] = [];
  const hiddenNodes: ConfigNode[] = [];
  let currentOrder = startOrder;
  for (const item of items) {
    if (typeof item === "string") continue;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const [name, value] of Object.entries(item)) {
        const node: ConfigNode = { name, patterns: [], children: [], order: currentOrder++ };
        if (value === null) {
          // Tombstone: kept out of `nodes` (so visible structure/counts are
          // unaffected) but still carrying an implicit catch-all pattern, so CRDs
          // that would only match through it are routed here and dropped (see
          // `organizeCrdsIntoTree`) instead of falling back to the flat list.
          node.hidden = true;
          node.patterns.push("");
          hiddenNodes.push(node);
          continue;
        }
        if (Array.isArray(value)) {
          for (const subItem of value) {
            if (typeof subItem === "string") node.patterns.push(subItem);
            // `node.children.length + hiddenChildren.length` (not a literal 0, and not
            // `node.children.length` alone) keeps sibling sub-groups in declaration
            // order at any depth: a hardcoded start let every group below depth 2 fall
            // back to alphabetical (all siblings tied at 0), and counting visible
            // children only let a hidden (`null`) sibling and the next visible one end
            // up with the same order, since a hidden sibling is never pushed into
            // `node.children` but still occupies a declaration slot.
            else if (subItem && typeof subItem === "object") {
              const { nodes: subNodes, hiddenNodes: subHidden } = parseItemsRecursively(
                [subItem],
                node.children.length + (node.hiddenChildren?.length ?? 0),
              );
              node.children.push(...subNodes);
              if (subHidden.length > 0) node.hiddenChildren = [...(node.hiddenChildren ?? []), ...subHidden];
            }
          }
        } else if (value && typeof value === "object") {
          // Mapping-style nesting (`Name:\n  Sub: [...]`, no leading "-"), supported
          // at any depth by reusing the same recursive parser as the array style.
          const { nodes: subNodes, hiddenNodes: subHidden } = parseItemsRecursively(
            Object.entries(value).map(([subName, subValue]) => ({ [subName]: subValue })),
            0,
          );
          node.children.push(...subNodes);
          if (subHidden.length > 0) node.hiddenChildren = [...(node.hiddenChildren ?? []), ...subHidden];
        }
        nodes.push(node);
      }
    }
  }
  return { nodes, hiddenNodes };
}

function parseGroupConfig(configString: string): ParsedConfig | null {
  if (!configString || typeof configString !== "string" || configString.trim() === "") return null;
  try {
    const config = yaml.load(configString);
    if (!config || typeof config !== "object" || Array.isArray(config)) return null;
    const nodes: ConfigNode[] = [];
    const hiddenNodes: ConfigNode[] = [];
    let order = 0;
    for (const [topLevelName, topLevelValue] of Object.entries(config as Record<string, any>)) {
      if (topLevelValue === null) {
        // Same tombstone treatment as nested null values (see parseItemsRecursively),
        // so a hidden top-level group also actually drops its matching CRDs instead
        // of leaving them to fall back to the flat/ungrouped list.
        hiddenNodes.push({ name: topLevelName, patterns: [""], children: [], order: order++, hidden: true });
        continue;
      }
      const node: ConfigNode = { name: topLevelName, patterns: [], children: [], order: order++ };
      if (Array.isArray(topLevelValue)) {
        for (const item of topLevelValue) {
          if (typeof item === "string") node.patterns.push(item);
          else if (item && typeof item === "object") {
            const { nodes: subNodes, hiddenNodes: subHidden } = parseItemsRecursively(
              [item],
              node.children.length + (node.hiddenChildren?.length ?? 0),
            );
            node.children.push(...subNodes);
            if (subHidden.length > 0) node.hiddenChildren = [...(node.hiddenChildren ?? []), ...subHidden];
          }
        }
      } else if (typeof topLevelValue === "object") {
        // Same grammar as the array style, just written without the leading "-".
        // Delegating to parseItemsRecursively (instead of a hand-rolled 2-level-only
        // loop) means mapping-style groups support sub-groups at any depth too.
        const { nodes: subNodes, hiddenNodes: subHidden } = parseItemsRecursively(
          Object.entries(topLevelValue).map(([subName, subValue]) => ({ [subName]: subValue })),
          0,
        );
        node.children.push(...subNodes);
        if (subHidden.length > 0) node.hiddenChildren = [...(node.hiddenChildren ?? []), ...subHidden];
      }
      nodes.push(node);
    }
    return hiddenNodes.length > 0 ? { nodes, hiddenNodes } : { nodes };
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
      candidates.push({
        pattern,
        path: nodePath,
        specificity: getPatternSpecificity(pattern),
        ...(node.hidden ? { hidden: true } : {}),
      });
    }
    // Hidden (tombstone) children are merged back in and sorted by declaration
    // `order`, so a "first match wins" tie between a hidden and a visible
    // catch-all pattern is resolved the same way regardless of null-hiding.
    const children = node.hiddenChildren?.length
      ? [...node.children, ...node.hiddenChildren].sort((a, b) => a.order - b.order)
      : node.children;
    if (children.length > 0) candidates.push(...collectPatternCandidates(children, nodePath));
  }
  return candidates;
}

function findGroupPath(crdName: string, config: ParsedConfig | null): GroupPath | null {
  if (!config || (!config.nodes.length && !config.hiddenNodes?.length)) return null;
  const rootNodes = config.hiddenNodes?.length
    ? [...config.nodes, ...config.hiddenNodes].sort((a, b) => a.order - b.order)
    : config.nodes;
  const candidates = collectPatternCandidates(rootNodes);
  const matches = candidates.filter((c) => matchesPattern(crdName, c.pattern));
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    return b.path.length - a.path.length;
  });
  const winner = matches[0];
  return winner.hidden ? { path: winner.path, hidden: true } : { path: winner.path };
}

// ===============================
// ORGANISING CRDS INTO A TREE
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
      // A CRD matched only through a null-configured group must actually
      // disappear, not fall back to the flat/ungrouped list.
      if (groupPath.hidden) continue;
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
// SIDEBAR ITEM GENERATION
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
    const childPathId = buildGroupPathId(childPath);
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
          // The API group is part of the id because a config group can hold two
          // CRDs with the same plural name (backups.velero.io and
          // backups.k8up.io), and equal ids make the registrator drop one.
          id: `${sideBarItemCustomResourcePrefix}-${childPathId}/${definition.getGroup()}/${definition.getPluralName()}`,
          parentId: groupItem.id,
          definition,
          // Sub-group orderNumbers (child.order, just above) are always >= 0, so a
          // negative orderNumber for direct CRD items guarantees they never collide
          // with a sub-group sharing the same parentId, at any depth, while CRDs
          // keep their own alphabetical order relative to each other.
          itemIndex: i - sortedCrds.length,
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
  buildGroupPathId,
  collectPatternCandidates,
  findGroupPath,
  generateSidebarItemsRecursive,
  getPatternSpecificity,
  matchesPattern,
  organizeCrdsIntoTree,
  parseGroupConfig,
};

export type { ConfigNode, CrdTreeNode, GroupPath, ParsedConfig, PatternCandidate };

export default customResourceDefinitionGroupsSidebarItemsComputedInjectable;
