/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition } from "@freelensapp/kube-object";
import { computed } from "mobx";
import customResourcesSidebarItemInjectable from "../../custom-resources/sidebar-item.injectable";
// Import functions and types from the module for testing
import {
  collectPatternCandidates,
  findGroupPath,
  generateApiGroupSidebarItems,
  generateSidebarItemsRecursive,
  getPatternSpecificity,
  matchesPattern,
  organizeCrdsIntoTree,
  parseGroupConfig,
} from "../groups-sidebar-items-computed.injectable";

import type { ConfigNode } from "../groups-sidebar-items-computed.injectable";

// Helper to create a mock CRD
function createMockCrd(pluralName: string, group: string): CustomResourceDefinition {
  return {
    getPluralName: () => pluralName,
    getGroup: () => group,
    getResourceKind: () => pluralName.charAt(0).toUpperCase() + pluralName.slice(1),
  } as CustomResourceDefinition;
}

describe("CRD Groups - N-Level Hierarchy Support", () => {
  describe("parseGroupConfig", () => {
    it("should return null for empty or invalid input", () => {
      expect(parseGroupConfig("")).toBeNull();
      expect(parseGroupConfig("   ")).toBeNull();
      expect(parseGroupConfig(123 as any)).toBeNull();
      expect(parseGroupConfig("invalid yaml:[")).toBeNull();
    });

    it("should return null for a YAML array at the root level", () => {
      expect(parseGroupConfig("- item1\n- item2")).toBeNull();
    });

    it("should return null for a scalar YAML value", () => {
      expect(parseGroupConfig("just-a-string")).toBeNull();
    });

    it("should parse basic YAML configuration with 1 level", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
AWS:
  - aws.amazon.com
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(result?.nodes).toHaveLength(2);
      expect(result?.nodes[0].name).toBe("Kubernetes");
      expect(result?.nodes[0].patterns).toEqual(["k8s.io"]);
      expect(result?.nodes[1].name).toBe("AWS");
      expect(result?.nodes[1].patterns).toEqual(["aws.amazon.com"]);
    });

    it("should parse configuration with 2 levels (subgroups)", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
  - API:
    - api.k8s.io
  - Storage:
    - storage.k8s.io
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(result?.nodes).toHaveLength(1);
      expect(result?.nodes[0].name).toBe("Kubernetes");
      expect(result?.nodes[0].patterns).toEqual(["k8s.io"]);
      expect(result?.nodes[0].children).toHaveLength(2);
      expect(result?.nodes[0].children[0].name).toBe("API");
      expect(result?.nodes[0].children[0].patterns).toEqual(["api.k8s.io"]);
      expect(result?.nodes[0].children[1].name).toBe("Storage");
      expect(result?.nodes[0].children[1].patterns).toEqual(["storage.k8s.io"]);
    });

    it("should parse configuration with 3 levels (deep nesting)", () => {
      const yamlConfig = `
GitOps:
  - FluxCD:
      - kustomize.toolkit.fluxcd.io
      - Image Policies:
          - image.toolkit.fluxcd.io
      - Source Control:
          - helm.toolkit.fluxcd.io
          - source.toolkit.fluxcd.io
      - Notifications:
          - notification.toolkit.fluxcd.io
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(result?.nodes).toHaveLength(1);

      // Level 1: GitOps
      const gitOps = result?.nodes[0];
      expect(gitOps?.name).toBe("GitOps");
      expect(gitOps?.patterns).toEqual([]);
      expect(gitOps?.children).toHaveLength(1);

      // Level 2: FluxCD
      const fluxCD = gitOps?.children[0];
      expect(fluxCD?.name).toBe("FluxCD");
      expect(fluxCD?.patterns).toEqual(["kustomize.toolkit.fluxcd.io"]);
      expect(fluxCD?.children).toHaveLength(3);

      // Level 3: Image Policies
      const imagePolicies = fluxCD?.children[0];
      expect(imagePolicies?.name).toBe("Image Policies");
      expect(imagePolicies?.patterns).toEqual(["image.toolkit.fluxcd.io"]);

      // Level 3: Source Control
      const sourceControl = fluxCD?.children[1];
      expect(sourceControl?.name).toBe("Source Control");
      expect(sourceControl?.patterns).toEqual(["helm.toolkit.fluxcd.io", "source.toolkit.fluxcd.io"]);

      // Level 3: Notifications
      const notifications = fluxCD?.children[2];
      expect(notifications?.name).toBe("Notifications");
      expect(notifications?.patterns).toEqual(["notification.toolkit.fluxcd.io"]);
    });

    it("should preserve the order of groups", () => {
      const yamlConfig = `
C:
  - c.io
A:
  - a.io
B:
  - b.io
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(result?.nodes[0].name).toBe("C");
      expect(result?.nodes[0].order).toBe(0);
      expect(result?.nodes[1].name).toBe("A");
      expect(result?.nodes[1].order).toBe(1);
      expect(result?.nodes[2].name).toBe("B");
      expect(result?.nodes[2].order).toBe(2);
    });

    it("should handle null values for hiding entries", () => {
      const yamlConfig = `
Visible:
  - visible.io
Hidden: null
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      // Hidden should be skipped (not in nodes)
      expect(result?.nodes).toHaveLength(1);
      expect(result?.nodes[0].name).toBe("Visible");
    });

    it("should handle empty string patterns for catch-all", () => {
      const yamlConfig = `
Main:
  - specific.pattern
  - ""
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(result?.nodes[0].patterns).toContain("");
      expect(result?.nodes[0].patterns).toContain("specific.pattern");
    });

    it("should preserve declaration order for sub-groups nested below depth 2", () => {
      // Regression test: sub-groups below depth 2 used to all get `order: 0`
      // (a hardcoded start value instead of the running sibling count), so they
      // fell back to alphabetical order instead of their declared order.
      const yamlConfig = `
FluxCD:
  - kustomize.toolkit.fluxcd.io
  - Image Policies:
    - image.toolkit.fluxcd.io
  - Source Control:
    - source.toolkit.fluxcd.io
  - Notifications:
    - notification.toolkit.fluxcd.io
  - Control Plane:
    - fluxcd.controlplane.io
`;

      const result = parseGroupConfig(yamlConfig);
      const children = result?.nodes[0].children ?? [];

      expect(children.map((c) => c.name)).toEqual([
        "Image Policies",
        "Source Control",
        "Notifications",
        "Control Plane",
      ]);
      expect(children.map((c) => c.order)).toEqual([0, 1, 2, 3]);
    });

    it("should support mapping-style groups (no leading '-') nested below depth 2", () => {
      // Regression test: only the array style (`- Name:`) supported a 3rd level;
      // the mapping style (`Name:` directly, no leading "-") silently dropped it.
      const yamlConfig = `
Cluster Management:
  Cluster API:
    Addons:
      - addons.cluster.x-k8s.io
    Runtime:
      - runtime.cluster.x-k8s.io
`;

      const config = parseGroupConfig(yamlConfig);
      const clusterApi = config?.nodes[0].children[0];

      expect(clusterApi?.name).toBe("Cluster API");
      expect(clusterApi?.children.map((c) => c.name)).toEqual(["Addons", "Runtime"]);
      expect(clusterApi?.children.map((c) => c.order)).toEqual([0, 1]);
      expect(clusterApi?.children[0].patterns).toEqual(["addons.cluster.x-k8s.io"]);

      expect(findGroupPath("resources.addons.cluster.x-k8s.io", config)).toEqual({
        path: ["Cluster Management", "Cluster API", "Addons"],
      });
    });
  });

  describe("matchesPattern", () => {
    it("should match when pattern is a substring of the CRD name", () => {
      expect(matchesPattern("foo.bar.com", "bar")).toBe(true);
    });

    it("should not match when pattern is not found", () => {
      expect(matchesPattern("foo.bar.com", "xyz")).toBe(false);
    });

    it("should match everything with empty pattern", () => {
      expect(matchesPattern("any.group.com", "")).toBe(true);
    });

    it("should handle exact matches", () => {
      expect(matchesPattern("exact.match", "exact.match")).toBe(true);
    });

    it("should not match when pattern is null", () => {
      expect(matchesPattern("foo.bar.com", null as any)).toBe(false);
    });
  });

  describe("getPatternSpecificity", () => {
    it("should count dots for specificity scoring", () => {
      expect(getPatternSpecificity("simple")).toBe(0);
      expect(getPatternSpecificity("one.dot")).toBe(1);
      expect(getPatternSpecificity("a.more.complex.pattern")).toBe(3);
    });

    it("should handle empty patterns", () => {
      expect(getPatternSpecificity("")).toBe(0);
    });
  });

  describe("collectPatternCandidates", () => {
    it("should collect patterns from all levels", () => {
      const nodes: ConfigNode[] = [
        {
          name: "Level1",
          patterns: ["level1.pattern"],
          order: 0,
          children: [
            {
              name: "Level2",
              patterns: ["level2.pattern"],
              order: 0,
              children: [
                {
                  name: "Level3",
                  patterns: ["level3.pattern"],
                  order: 0,
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      const candidates = collectPatternCandidates(nodes);

      expect(candidates).toHaveLength(3);
      expect(candidates[0]).toEqual({
        pattern: "level1.pattern",
        path: ["Level1"],
        specificity: 1,
      });
      expect(candidates[1]).toEqual({
        pattern: "level2.pattern",
        path: ["Level1", "Level2"],
        specificity: 1,
      });
      expect(candidates[2]).toEqual({
        pattern: "level3.pattern",
        path: ["Level1", "Level2", "Level3"],
        specificity: 1,
      });
    });
  });

  describe("findGroupPath", () => {
    it("should return null if config is null", () => {
      expect(findGroupPath("test.group", null)).toBeNull();
    });

    it("should return null if config has no nodes", () => {
      expect(findGroupPath("test.group", { nodes: [] })).toBeNull();
    });

    it("should return null when no pattern matches", () => {
      const config = parseGroupConfig("Kubernetes:\n  - k8s.io");

      expect(findGroupPath("unmatched.pattern.com", config)).toBeNull();
    });

    it("should prefer deeper path when two patterns have equal specificity", () => {
      const yamlConfig = `
Top:
  - k8s.io
  - Sub:
    - k8s.io
`;
      const config = parseGroupConfig(yamlConfig);
      const result = findGroupPath("resources.k8s.io", config);
      expect(result?.path.length).toBeGreaterThanOrEqual(2);
    });

    it("should match to top level group with direct pattern", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
AWS:
  - aws.amazon.com
`;
      const config = parseGroupConfig(yamlConfig);

      expect(findGroupPath("crd.k8s.io", config)).toEqual({ path: ["Kubernetes"] });
      expect(findGroupPath("service.aws.amazon.com", config)).toEqual({ path: ["AWS"] });
    });

    it("should match to 2nd level group", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
  - API:
    - api.k8s.io
  - Storage:
    - storage.k8s.io
`;
      const config = parseGroupConfig(yamlConfig);

      expect(findGroupPath("resources.k8s.io", config)).toEqual({ path: ["Kubernetes"] });
      expect(findGroupPath("resources.api.k8s.io", config)).toEqual({ path: ["Kubernetes", "API"] });
      expect(findGroupPath("volumes.storage.k8s.io", config)).toEqual({ path: ["Kubernetes", "Storage"] });
    });

    it("should match to 3rd level group (deep nesting)", () => {
      const yamlConfig = `
GitOps:
  - FluxCD:
      - kustomize.toolkit.fluxcd.io
      - Image Policies:
          - image.toolkit.fluxcd.io
      - Source Control:
          - helm.toolkit.fluxcd.io
          - source.toolkit.fluxcd.io
      - Notifications:
          - notification.toolkit.fluxcd.io
`;
      const config = parseGroupConfig(yamlConfig);

      // Direct pattern in FluxCD
      expect(findGroupPath("kustomizations.kustomize.toolkit.fluxcd.io", config)).toEqual({
        path: ["GitOps", "FluxCD"],
      });

      // Patterns in sub-groups of FluxCD
      expect(findGroupPath("imagepolicies.image.toolkit.fluxcd.io", config)).toEqual({
        path: ["GitOps", "FluxCD", "Image Policies"],
      });
      expect(findGroupPath("helmreleases.helm.toolkit.fluxcd.io", config)).toEqual({
        path: ["GitOps", "FluxCD", "Source Control"],
      });
      expect(findGroupPath("gitrepositories.source.toolkit.fluxcd.io", config)).toEqual({
        path: ["GitOps", "FluxCD", "Source Control"],
      });
      expect(findGroupPath("alerts.notification.toolkit.fluxcd.io", config)).toEqual({
        path: ["GitOps", "FluxCD", "Notifications"],
      });
    });

    it("should prefer more specific patterns", () => {
      const yamlConfig = `
General:
  - io
Specific:
  - k8s.io
MoreSpecific:
  - api.k8s.io
`;
      const config = parseGroupConfig(yamlConfig);

      // Should match the most specific pattern
      expect(findGroupPath("resources.api.k8s.io", config)).toEqual({ path: ["MoreSpecific"] });
      expect(findGroupPath("resources.k8s.io", config)).toEqual({ path: ["Specific"] });
    });

    it("should handle catch-all patterns", () => {
      const yamlConfig = `
Main:
  - specific.pattern
Others:
  - ""
`;
      const config = parseGroupConfig(yamlConfig);

      expect(findGroupPath("any.other.group", config)).toEqual({ path: ["Others"] });
      expect(findGroupPath("specific.pattern.com", config)).toEqual({ path: ["Main"] });
    });
  });

  describe("organizeCrdsIntoTree", () => {
    it("should return an empty root for an empty CRD list", () => {
      const { root } = organizeCrdsIntoTree([], "Kubernetes:\n  - k8s.io");
      expect(root.children.size).toBe(0);
    });

    it("should leave every CRD ungrouped when config is empty", () => {
      const crds = [createMockCrd("deployments", "apps.k8s.io"), createMockCrd("pods", "core.k8s.io")];
      const { root, ungrouped } = organizeCrdsIntoTree(crds, "");

      expect(root.children.size).toBe(0);
      expect(ungrouped).toEqual(crds);
    });

    it("should organize CRDs into a tree structure", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
  - Storage:
    - storage.k8s.io
`;
      const crds = [createMockCrd("deployments", "apps.k8s.io"), createMockCrd("storageclasses", "storage.k8s.io")];

      const { root } = organizeCrdsIntoTree(crds, yamlConfig);

      expect(root.children.size).toBe(1);
      const kubernetes = root.children.get("Kubernetes");
      expect(kubernetes).toBeDefined();
      expect(kubernetes?.crds).toHaveLength(1);
      expect(kubernetes?.children.size).toBe(1);

      const storage = kubernetes?.children.get("Storage");
      expect(storage).toBeDefined();
      expect(storage?.crds).toHaveLength(1);
    });

    it("should handle 3-level deep organization", () => {
      const yamlConfig = `
GitOps:
  - FluxCD:
      - kustomize.toolkit.fluxcd.io
      - Image Policies:
          - image.toolkit.fluxcd.io
`;
      const crds = [
        createMockCrd("kustomizations", "kustomize.toolkit.fluxcd.io"),
        createMockCrd("imagepolicies", "image.toolkit.fluxcd.io"),
      ];

      const { root } = organizeCrdsIntoTree(crds, yamlConfig);

      // Navigate to GitOps
      const gitOps = root.children.get("GitOps");
      expect(gitOps).toBeDefined();
      expect(gitOps?.crds).toHaveLength(0);

      // Navigate to FluxCD
      const fluxCD = gitOps?.children.get("FluxCD");
      expect(fluxCD).toBeDefined();
      expect(fluxCD?.crds).toHaveLength(1); // kustomizations
      expect(fluxCD?.crds[0].getPluralName()).toBe("kustomizations");

      // Navigate to Image Policies
      const imagePolicies = fluxCD?.children.get("Image Policies");
      expect(imagePolicies).toBeDefined();
      expect(imagePolicies?.crds).toHaveLength(1); // imagepolicies
      expect(imagePolicies?.crds[0].getPluralName()).toBe("imagepolicies");
    });

    it("should actually hide CRDs matched only by a null-configured top-level group", () => {
      // Regression test: a null-configured group used to just drop its own
      // patterns, so a CRD that would only match through it fell back to the
      // flat/ungrouped list and still rendered — the opposite of "hidden".
      const yamlConfig = `
Visible:
  - visible.io
Hidden: null
`;
      const crds = [createMockCrd("visibles", "visible.io"), createMockCrd("hiddens", "hidden.io")];
      const { root, ungrouped } = organizeCrdsIntoTree(crds, yamlConfig);

      expect(ungrouped).toHaveLength(0);
      expect(root.children.get("Visible")?.crds).toHaveLength(1);
      expect(root.children.get("Hidden")).toBeUndefined();
    });

    it("should actually hide CRDs matched only by a null-configured sub-group", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
  - API:
    - api.k8s.io
  - Storage: null
`;
      const crds = [
        createMockCrd("things", "k8s.io"),
        createMockCrd("apithings", "api.k8s.io"),
        // Deliberately doesn't also substring-match "k8s.io", so this checks
        // real hiding rather than the (separate, expected) fallback to a
        // broader still-visible parent pattern.
        createMockCrd("storagethings", "storage.example.com"),
      ];
      const { root, ungrouped } = organizeCrdsIntoTree(crds, yamlConfig);

      expect(ungrouped).toHaveLength(0);
      const kubernetes = root.children.get("Kubernetes");
      expect(kubernetes?.crds).toHaveLength(1);
      expect(kubernetes?.children.get("API")?.crds).toHaveLength(1);
      expect(kubernetes?.children.get("Storage")).toBeUndefined();
    });

    it("should keep declaration-order precedence between a hidden sibling and a later visible sibling", () => {
      // Regression test: the sub-group order counter used `node.children.length`
      // (visible children only) as the next order value, so a hidden (`null`)
      // sibling and the next visible sibling could end up with the same `order`.
      // That collision could flip pattern-matching precedence, letting a later,
      // equally-specific visible pattern win over an earlier-declared hidden one.
      const yamlConfig = `
Group:
  - A:
    - a.example.com
  - Hidden: null
  - C:
    - foo
`;
      // "foo" (C's pattern) and "" (Hidden's catch-all) are both specificity 0
      // and both match this CRD; Hidden was declared before C, so it must win.
      const crds = [createMockCrd("foothings", "foo.example.org")];
      const { root, ungrouped } = organizeCrdsIntoTree(crds, yamlConfig);

      expect(ungrouped).toHaveLength(0);
      expect(root.children.get("Group")?.children.get("C")).toBeUndefined();
    });

    it("should report unmatched CRDs as ungrouped", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
`;
      const unmatched = createMockCrd("myresources", "custom.example.com");
      const crds = [createMockCrd("deployments", "apps.k8s.io"), unmatched];

      const { root, ungrouped } = organizeCrdsIntoTree(crds, yamlConfig);

      // Kubernetes group should have the k8s.io CRD
      const kubernetes = root.children.get("Kubernetes");
      expect(kubernetes?.crds).toHaveLength(1);

      // The unmatched CRD gets no group of its own, it stays ungrouped
      expect(root.children.size).toBe(1);
      expect(ungrouped).toEqual([unmatched]);
    });
  });

  describe("generateSidebarItemsRecursive", () => {
    const options = {
      navigateToCustomResources: () => {},
      customResourcesRoute: {},
      pathParameters: { get: () => ({}) },
    };

    it("should give CRDs sharing a plural name distinct ids within the same group", () => {
      const crds = [createMockCrd("backups", "velero.io"), createMockCrd("backups", "k8up.io")];
      const { root } = organizeCrdsIntoTree(crds, 'Backups:\n  - ""');

      const ids = generateSidebarItemsRecursive(root, "parent-item", [], options).map((item) => item.id);

      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
      expect(ids).toContain("sidebar-item-custom-resource-group-Backups");
      expect(ids).toContain("sidebar-item-custom-resource-group-Backups/velero.io/backups");
      expect(ids).toContain("sidebar-item-custom-resource-group-Backups/k8up.io/backups");
    });

    it("should include the whole group path in the ids of nested groups", () => {
      const yamlConfig = `
GitOps:
  - FluxCD:
      - source.toolkit.fluxcd.io
`;
      const crds = [createMockCrd("gitrepositories", "source.toolkit.fluxcd.io")];
      const { root } = organizeCrdsIntoTree(crds, yamlConfig);

      const ids = generateSidebarItemsRecursive(root, "parent-item", [], options).map((item) => item.id);

      expect(ids).toEqual([
        "sidebar-item-custom-resource-group-GitOps",
        "sidebar-item-custom-resource-group-GitOps-FluxCD",
        "sidebar-item-custom-resource-group-GitOps-FluxCD/source.toolkit.fluxcd.io/gitrepositories",
      ]);
    });

    it("should not collide ids between a flat group named 'X-Y' and nested groups ['X','Y']", () => {
      // Regression test: joining path segments with "-" made a flat group
      // literally named "Cluster-API" indistinguishable from nested groups
      // ["Cluster", "API"] — both produced the same id, silently dropping one.
      const yamlConfig = `
Cluster-API:
  - flat.example.io
Cluster:
  - API:
    - nested.example.io
`;
      const crds = [createMockCrd("flats", "flat.example.io"), createMockCrd("nesteds", "nested.example.io")];
      const { root } = organizeCrdsIntoTree(crds, yamlConfig);

      const ids = generateSidebarItemsRecursive(root, "parent-item", [], options).map((item) => item.id);

      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain("sidebar-item-custom-resource-group-Cluster\\-API");
      expect(ids).toContain("sidebar-item-custom-resource-group-Cluster-API");
    });

    it("should not collide orderNumbers between direct CRDs and sub-groups sharing a parent", () => {
      // Regression test: direct CRDs and sub-groups under the same group each got
      // their own 0-based orderNumber, so they could collide/interleave when the
      // sidebar sorts same-parent siblings. Each sub-group needs a matching CRD of
      // its own so its tree node (and sidebar item) actually gets created.
      const yamlConfig = `
Kubernetes:
  - k8s.io
  - API:
    - api.k8s.io
  - Storage:
    - storage.k8s.io
`;
      const crds = [
        createMockCrd("things", "k8s.io"),
        createMockCrd("others", "k8s.io"),
        createMockCrd("apithings", "api.k8s.io"),
        createMockCrd("storagethings", "storage.k8s.io"),
      ];
      const { root } = organizeCrdsIntoTree(crds, yamlConfig);

      const fakeDi = { inject: () => computed(() => true) } as any;
      const items = generateSidebarItemsRecursive(root, "parent-item", [], options);
      const crdOrderNumbers = items
        .filter((item) => item.id.includes("/k8s.io/"))
        .map((item) => item.instantiate(fakeDi).orderNumber);
      const subGroupOrderNumbers = items
        .filter((item) => item.id.endsWith("-Kubernetes-API") || item.id.endsWith("-Kubernetes-Storage"))
        .map((item) => item.instantiate().orderNumber);

      expect(crdOrderNumbers).toHaveLength(2);
      expect(subGroupOrderNumbers).toHaveLength(2);
      expect(Math.max(...crdOrderNumbers)).toBeLessThan(Math.min(...subGroupOrderNumbers));
      expect(new Set([...crdOrderNumbers, ...subGroupOrderNumbers]).size).toBe(
        crdOrderNumbers.length + subGroupOrderNumbers.length,
      );
    });

    it("should not collide orderNumbers between top-level configured groups and leftover ungrouped API-group headers", () => {
      // Regression test: top-level configured groups (`child.order`) and
      // leftover/ungrouped API-group headers (`index + 1`) shared the same
      // parentId while both numbering from 0/1, so an ungrouped API group could
      // sort in between two configured groups instead of after all of them.
      const yamlConfig = `
A:
  - a.example.com
B:
  - b.example.com
C:
  - c.example.com
`;
      const crds = [
        createMockCrd("as", "a.example.com"),
        createMockCrd("bs", "b.example.com"),
        createMockCrd("cs", "c.example.com"),
        createMockCrd("foos", "foo.example.org"),
        createMockCrd("bars", "bar.example.org"),
      ];
      const { root, config, ungrouped } = organizeCrdsIntoTree(crds, yamlConfig);
      expect(ungrouped).toHaveLength(2);

      const topLevelGroupCount = (config?.nodes.length ?? 0) + (config?.hiddenNodes?.length ?? 0);
      const groupItems = generateSidebarItemsRecursive(
        root,
        customResourcesSidebarItemInjectable.id,
        [],
        options,
      ).filter((item) => !item.id.includes("/"));
      const apiGroupItems = generateApiGroupSidebarItems(ungrouped, options, topLevelGroupCount).filter(
        (item) => !item.id.includes("/"),
      );

      const fakeDi = { inject: () => computed(() => true) } as any;
      const groupOrderNumbers = groupItems.map((item) => item.instantiate(fakeDi).orderNumber);
      const apiGroupOrderNumbers = apiGroupItems.map((item) => item.instantiate(fakeDi).orderNumber);

      expect(groupOrderNumbers).toHaveLength(3);
      expect(apiGroupOrderNumbers).toHaveLength(2);
      expect(Math.max(...groupOrderNumbers)).toBeLessThan(Math.min(...apiGroupOrderNumbers));
    });

    it("should never assign orderNumber 0 to a root-level group or ungrouped API-group header", () => {
      // Regression test: the statically-registered "Definitions" sidebar item
      // (../sidebar-item.injectable.ts) shares parentId with every item produced
      // here and has a hardcoded `orderNumber: 0`. Root-level configured groups
      // (`child.order`) and, when there is no config at all, ungrouped API-group
      // headers (`orderNumberOffset + index`) both used to start counting from 0
      // too, so either could tie with "Definitions" whenever a user is allowed to
      // see both CRD definitions and CRD instances (a common RBAC combination).
      const DEFINITIONS_ORDER_NUMBER = 0;
      const fakeDi = { inject: () => computed(() => true) } as any;

      // Case 1: at least one configured top-level group exists.
      {
        const yamlConfig = `
A:
  - a.example.com
B:
  - b.example.com
`;
        const crds = [createMockCrd("as", "a.example.com"), createMockCrd("bs", "b.example.com")];
        const { root } = organizeCrdsIntoTree(crds, yamlConfig);
        const groupItems = generateSidebarItemsRecursive(
          root,
          customResourcesSidebarItemInjectable.id,
          [],
          options,
          1, // matches the `rootOrderNumberOffset` passed by the real computed injectable
        ).filter((item) => !item.id.includes("/"));

        expect(groupItems).toHaveLength(2);
        expect(groupItems.map((item) => item.instantiate(fakeDi).orderNumber)).not.toContain(DEFINITIONS_ORDER_NUMBER);
      }

      // Case 2: no grouping config at all, so every CRD ends up in `ungrouped`.
      {
        const crds = [createMockCrd("foos", "foo.example.org"), createMockCrd("bars", "bar.example.org")];
        const { config, ungrouped } = organizeCrdsIntoTree(crds, "");
        expect(ungrouped).toHaveLength(2);

        const topLevelGroupCount = (config?.nodes.length ?? 0) + (config?.hiddenNodes?.length ?? 0);
        const apiGroupItems = generateApiGroupSidebarItems(ungrouped, options, topLevelGroupCount + 1).filter(
          (item) => !item.id.includes("/"),
        );

        expect(apiGroupItems).toHaveLength(2);
        expect(apiGroupItems.map((item) => item.instantiate(fakeDi).orderNumber)).not.toContain(
          DEFINITIONS_ORDER_NUMBER,
        );
      }
    });
  });

  describe("Integration tests for complex configurations", () => {
    it("should handle the full FluxCD configuration example", () => {
      const yamlConfig = `
GitOps:
  - FluxCD:
      - kustomize.toolkit.fluxcd.io
      - Image Policies:
          - image.toolkit.fluxcd.io
      - Source Control:
          - helm.toolkit.fluxcd.io
          - source.toolkit.fluxcd.io
      - Notifications:
          - notification.toolkit.fluxcd.io

Policy & Security:
  - GateKeeper:
    - config.gatekeeper.sh
    - templates.gatekeeper.sh
  - Kyverno:
    - kyverno.io

Others:
  - ""
`;

      const crds = [
        // FluxCD resources
        createMockCrd("kustomizations", "kustomize.toolkit.fluxcd.io"),
        createMockCrd("imagepolicies", "image.toolkit.fluxcd.io"),
        createMockCrd("helmreleases", "helm.toolkit.fluxcd.io"),
        createMockCrd("gitrepositories", "source.toolkit.fluxcd.io"),
        createMockCrd("alerts", "notification.toolkit.fluxcd.io"),
        // GateKeeper resources
        createMockCrd("configs", "config.gatekeeper.sh"),
        createMockCrd("constrainttemplates", "templates.gatekeeper.sh"),
        // Kyverno resources
        createMockCrd("clusterpolicies", "kyverno.io"),
        // Unmatched resource
        createMockCrd("myresources", "unknown.example.com"),
      ];

      const { root, ungrouped } = organizeCrdsIntoTree(crds, yamlConfig);

      // The catch-all pattern leaves nothing ungrouped
      expect(ungrouped).toHaveLength(0);

      // Check GitOps structure
      const gitOps = root.children.get("GitOps");
      expect(gitOps).toBeDefined();

      const fluxCD = gitOps?.children.get("FluxCD");
      expect(fluxCD).toBeDefined();
      expect(fluxCD?.crds).toHaveLength(1); // kustomizations

      const imagePolicies = fluxCD?.children.get("Image Policies");
      expect(imagePolicies?.crds).toHaveLength(1);

      const sourceControl = fluxCD?.children.get("Source Control");
      expect(sourceControl?.crds).toHaveLength(2); // helmreleases + gitrepositories

      const notifications = fluxCD?.children.get("Notifications");
      expect(notifications?.crds).toHaveLength(1);

      // Check Policy & Security structure
      const policySecurity = root.children.get("Policy & Security");
      expect(policySecurity).toBeDefined();

      const gatekeeper = policySecurity?.children.get("GateKeeper");
      expect(gatekeeper?.crds).toHaveLength(2);

      const kyverno = policySecurity?.children.get("Kyverno");
      expect(kyverno?.crds).toHaveLength(1);

      // Check catch-all for unmatched
      const others = root.children.get("Others");
      expect(others?.crds).toHaveLength(1);
      expect(others?.crds[0].getPluralName()).toBe("myresources");
    });

    it("should handle 4+ levels of nesting", () => {
      const yamlConfig = `
Cloud:
  - AWS:
      - Compute:
          - EC2:
              - ec2.aws.amazon.com
          - Lambda:
              - lambda.aws.amazon.com
`;

      const config = parseGroupConfig(yamlConfig);

      // Verify parsing went 4 levels deep
      expect(config?.nodes[0].name).toBe("Cloud");
      expect(config?.nodes[0].children[0].name).toBe("AWS");
      expect(config?.nodes[0].children[0].children[0].name).toBe("Compute");
      expect(config?.nodes[0].children[0].children[0].children[0].name).toBe("EC2");
      expect(config?.nodes[0].children[0].children[0].children[1].name).toBe("Lambda");

      // Verify CRD placement
      expect(findGroupPath("instances.ec2.aws.amazon.com", config)).toEqual({
        path: ["Cloud", "AWS", "Compute", "EC2"],
      });
      expect(findGroupPath("functions.lambda.aws.amazon.com", config)).toEqual({
        path: ["Cloud", "AWS", "Compute", "Lambda"],
      });
    });
  });
});
