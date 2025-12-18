/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition } from "@freelensapp/kube-object";
// Import functions and types from the module for testing
import {
  collectPatternCandidates,
  findGroupPath,
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
    it("should return the default path if config is null", () => {
      const result = findGroupPath("test.group", null);
      expect(result).toEqual({ path: ["test.group"] });
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

    it("should return default for unmatched CRDs", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
`;
      const config = parseGroupConfig(yamlConfig);

      expect(findGroupPath("unmatched.pattern.com", config)).toEqual({ path: ["unmatched.pattern.com"] });
    });
  });

  describe("organizeCrdsIntoTree", () => {
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

    it("should place unmatched CRDs in their own groups", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
`;
      const crds = [createMockCrd("deployments", "apps.k8s.io"), createMockCrd("myresources", "custom.example.com")];

      const { root } = organizeCrdsIntoTree(crds, yamlConfig);

      // Kubernetes group should have the k8s.io CRD
      const kubernetes = root.children.get("Kubernetes");
      expect(kubernetes?.crds).toHaveLength(1);

      // Unmatched CRD should be in its own group
      const customGroup = root.children.get("myresources.custom.example.com");
      expect(customGroup).toBeDefined();
      expect(customGroup?.crds).toHaveLength(1);
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

      const { root } = organizeCrdsIntoTree(crds, yamlConfig);

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
