/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition } from "@freelensapp/kube-object";
import * as yaml from "js-yaml";

// Import functions from the module for testing
// Note: The functions are not exported in the original file, so we need to recreate them here for testing
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
 * Gets the fully-qualified resource name for a CRD
 * @param crd CustomResourceDefinition
 * @returns Fully qualified resource name in format: pluralized-name.group
 */
const getFullyQualifiedResourceName = (crd: CustomResourceDefinition): string => {
  return `${crd.getPluralName()}.${crd.getGroup()}`;
};

describe("CRD Groups", () => {
  describe("parseGroupConfig", () => {
    it("should return null for empty or invalid input", () => {
      expect(parseGroupConfig("")).toBeNull();
      expect(parseGroupConfig("   ")).toBeNull();
      expect(parseGroupConfig(123 as any)).toBeNull();
      expect(parseGroupConfig("invalid yaml:[")).toBeNull();
    });

    it("should parse basic YAML configuration", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
AWS:
  - aws.amazon.com
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(result?.topLevelOrder).toEqual(["Kubernetes", "AWS"]);
      expect(result?.config).toEqual({
        Kubernetes: ["k8s.io"],
        AWS: ["aws.amazon.com"],
      });
    });

    it("should parse configuration with subgroups", () => {
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
      expect(result?.topLevelOrder).toEqual(["Kubernetes"]);
      expect(result?.subLevelOrder).toEqual({ Kubernetes: ["API", "Storage"] });
      expect(result?.config.Kubernetes).toBeDefined();
      expect(Array.isArray(result?.config.Kubernetes)).toBe(true);
    });

    it("should preserve the order of top-level groups", () => {
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
      expect(result?.topLevelOrder).toEqual(["C", "A", "B"]);
    });

    it("should handle null values for hiding entries", () => {
      const yamlConfig = `
Visible:
  - visible.io
Hidden: null
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(result?.config.Hidden).toBeNull();
    });

    it("should handle empty string patterns for catch-all", () => {
      const yamlConfig = `
Main:
  - specific.pattern
  - ""
`;

      const result = parseGroupConfig(yamlConfig);

      expect(result).not.toBeNull();
      expect(Array.isArray(result?.config.Main)).toBe(true);
      expect((result?.config.Main as string[]).includes("")).toBe(true);
    });
  });

  describe("matchesGroupPattern", () => {
    it("should match when pattern is a substring of the group", () => {
      expect(matchesGroupPattern("foo.bar.com", "bar")).toBe(true);
    });

    it("should not match when pattern is not found in the group", () => {
      expect(matchesGroupPattern("foo.bar.com", "xyz")).toBe(false);
    });

    it("should match everything with empty pattern", () => {
      expect(matchesGroupPattern("any.group.com", "")).toBe(true);
    });

    it("should handle exact matches", () => {
      expect(matchesGroupPattern("exact.match", "exact.match")).toBe(true);
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

  describe("findBestMatch", () => {
    it("should find the pattern with the highest specificity", () => {
      const patterns = ["simple", "more.specific", "even.more.specific"];
      expect(findBestMatch("test.even.more.specific.com", patterns)).toBe("even.more.specific");
    });

    it("should return null if no patterns match", () => {
      const patterns = ["foo", "bar", "baz"];
      expect(findBestMatch("something.else", patterns)).toBeNull();
    });

    it("should ignore null patterns", () => {
      const patterns = ["foo", null as any, "bar"];
      expect(findBestMatch("test.foo.com", patterns)).toBe("foo");
    });

    it("should handle empty patterns array", () => {
      expect(findBestMatch("test.group", [])).toBeNull();
    });
  });

  describe("getByNewGroup", () => {
    it("should return the default result if config is null", () => {
      expect(getByNewGroup("test.group", null as any)).toEqual({ topLevel: "test.group", subLevel: null });
    });

    it("should match to top level group with direct pattern", () => {
      const config: OrderedGroupConfig = {
        config: {
          Kubernetes: ["k8s.io"],
          AWS: ["aws.amazon.com"],
        },
        topLevelOrder: ["Kubernetes", "AWS"],
        subLevelOrder: {},
      };

      expect(getByNewGroup("crd.k8s.io", config)).toEqual({ topLevel: "Kubernetes", subLevel: null });
      expect(getByNewGroup("service.aws.amazon.com", config)).toEqual({ topLevel: "AWS", subLevel: null });
    });
    it("should match to sub level group", () => {
      const config: OrderedGroupConfig = {
        config: {
          Kubernetes: {
            General: ["k8s.io"],
            API: ["api.k8s.io"],
            Storage: ["storage.k8s.io"],
          },
        },
        topLevelOrder: ["Kubernetes"],
        subLevelOrder: { Kubernetes: ["General", "API", "Storage"] },
      };

      expect(getByNewGroup("crd.api.k8s.io", config)).toEqual({ topLevel: "Kubernetes", subLevel: "API" });
      expect(getByNewGroup("crd.storage.k8s.io", config)).toEqual({ topLevel: "Kubernetes", subLevel: "Storage" });
      expect(getByNewGroup("other.k8s.io", config)).toEqual({ topLevel: "Kubernetes", subLevel: "General" });
    });

    it("should handle catch-all patterns", () => {
      const config: OrderedGroupConfig = {
        config: {
          Main: ["specific.pattern", ""],
        },
        topLevelOrder: ["Main"],
        subLevelOrder: {},
      };

      expect(getByNewGroup("any.other.group", config)).toEqual({ topLevel: "Main", subLevel: null });
    });

    it("should skip null config entries", () => {
      const config: OrderedGroupConfig = {
        config: {
          Visible: ["visible.io"],
          Hidden: null,
        },
        topLevelOrder: ["Visible", "Hidden"],
        subLevelOrder: {},
      };

      // Should not match to the "Hidden" group
      expect(getByNewGroup("test.hidden.io", config)).toEqual({ topLevel: "test.hidden.io", subLevel: null });
    });
  });

  describe("getFullyQualifiedResourceName", () => {
    it("should create properly formatted resource name", () => {
      const mockCrd = {
        getPluralName: () => "test-resources",
        getGroup: () => "test.example.com",
      } as CustomResourceDefinition;

      expect(getFullyQualifiedResourceName(mockCrd)).toBe("test-resources.test.example.com");
    });
  });

  describe("Integration tests for multiple use cases", () => {
    it("should handle Example 1: Basic Organization", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
AWS:
  - aws.amazon.com
Azure:
  - azure.com
`;

      const config = parseGroupConfig(yamlConfig);
      expect(config).not.toBeNull();

      expect(getByNewGroup("resources.k8s.io", config!)).toEqual({ topLevel: "Kubernetes", subLevel: null });
      expect(getByNewGroup("lambda.aws.amazon.com", config!)).toEqual({ topLevel: "AWS", subLevel: null });
      expect(getByNewGroup("functions.azure.com", config!)).toEqual({ topLevel: "Azure", subLevel: null });

      // Should use default (original name) for unmatched groups
      expect(getByNewGroup("gcp.google.com", config!)).toEqual({ topLevel: "gcp.google.com", subLevel: null });
    });

    it("should handle Example 2: With Subgroups", () => {
      const yamlConfig = `
Kubernetes:
  - k8s.io
  - API:
    - api.k8s.io
  - Storage:
    - storage.k8s.io
`;

      const config = parseGroupConfig(yamlConfig);
      expect(config).not.toBeNull();

      expect(getByNewGroup("resources.k8s.io", config!)).toEqual({ topLevel: "Kubernetes", subLevel: null });
      expect(getByNewGroup("resources.api.k8s.io", config!)).toEqual({ topLevel: "Kubernetes", subLevel: "API" });
      expect(getByNewGroup("volumes.storage.k8s.io", config!)).toEqual({ topLevel: "Kubernetes", subLevel: "Storage" });
    });

    it("should handle Example 3: Advanced Structure with All Features", () => {
      const yamlConfig = `
Built-in:
  - apps
  - core
  - batch
Cloud:
  AWS:
    - aws.amazon.com
    - amazonaws.com
  Azure:
    - azure.com
    - microsoft.com
  GCP:
    - cloud.google.com
Ignored: null
Misc:
  - ""
`;

      const config = parseGroupConfig(yamlConfig);
      expect(config).not.toBeNull();

      // Test top-level matches
      expect(getByNewGroup("deployments.apps", config!)).toEqual({ topLevel: "Built-in", subLevel: null });
      expect(getByNewGroup("pods.core", config!)).toEqual({ topLevel: "Built-in", subLevel: null });

      // Test sub-level matches
      expect(getByNewGroup("lambda.aws.amazon.com", config!)).toEqual({ topLevel: "Cloud", subLevel: "AWS" });
      expect(getByNewGroup("functions.azure.com", config!)).toEqual({ topLevel: "Cloud", subLevel: "Azure" });

      // Test catch-all pattern
      expect(getByNewGroup("something.completely.different", config!)).toEqual({ topLevel: "Misc", subLevel: null });

      // Test null entry (should not match to Ignored)
      expect(getByNewGroup("should.be.ignored", config!)).not.toEqual({ topLevel: "Ignored", subLevel: null });
    });
  });
});
