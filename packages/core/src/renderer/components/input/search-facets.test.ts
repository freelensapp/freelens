/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { compileFacet, parseFacets, serializeFacets, withFacetValue, withoutFacet } from "./search-facets";

import type { FacetText, SearchFacet } from "./search-facets";

/**
 * Runs a facet the way `ItemListLayout` does: walk the texts with `test`, then
 * apply `negated`. Returns undefined when the facet does not compile.
 */
const matches = (facet: SearchFacet, texts: FacetText[]): boolean | undefined => {
  const compiled = compileFacet(facet);

  if (!compiled) {
    return undefined;
  }

  const found = texts.some((text) => compiled.test(text));

  return compiled.negated ? !found : found;
};

describe("search facets", () => {
  describe("parseFacets", () => {
    it("round-trips through serializeFacets", () => {
      const facets: SearchFacet[] = [
        { field: "name", values: ["nginx"], op: "contains" },
        { field: "namespace", values: ["kube-system", "default"], op: "equals" },
      ];

      expect(parseFacets(serializeFacets(facets))).toEqual(facets);
    });

    it("collapses an empty set to an empty param", () => {
      expect(serializeFacets([])).toBe("");
      expect(serializeFacets([{ field: "name", values: [] }])).toBe("");
    });

    it("yields nothing for an empty param", () => {
      expect(parseFacets("")).toEqual([]);
    });

    // The param is user-editable and lives in bookmarks across versions, so bad
    // input must degrade rather than throw.
    it.each([
      ["not json at all", "nginx"],
      ["a regex that looks like the start of JSON", "[a-z]+"],
      ["valid JSON of the wrong shape", '["nginx"]'],
      ["valid JSON that is not an array", '{"field":"name","values":["x"]}'],
      ["an array of malformed entries", '[{"field":"name"},{"values":["x"]},{"field":1,"values":[]}]'],
      ["an unknown operator", '[{"field":"name","values":["x"],"op":"startsWith"}]'],
    ])("survives %s", (_, raw) => {
      expect(parseFacets(raw)).toEqual([]);
    });

    it("drops valueless facets it finds in the param", () => {
      expect(parseFacets('[{"field":"name","values":[]},{"field":"ns","values":["kube-system"]}]')).toEqual([
        { field: "ns", values: ["kube-system"], op: undefined },
      ]);
    });

    // Regex was a flag beside the operator before it became one of its own.
    it("translates the legacy regex flag into the matching operator", () => {
      expect(parseFacets('[{"field":"name","values":["^prod"],"regex":true}]')).toEqual([
        { field: "name", values: ["^prod"], op: "matches" },
      ]);
    });

    it("translates a negated legacy regex flag", () => {
      expect(parseFacets('[{"field":"name","values":["^prod"],"op":"notContains","regex":true}]')).toEqual([
        { field: "name", values: ["^prod"], op: "notMatches" },
      ]);
    });

    it("carries the stored label through", () => {
      expect(parseFacets('[{"field":"ip","values":["10.0.0.1"],"title":"IP"}]')).toEqual([
        { field: "ip", values: ["10.0.0.1"], op: undefined, title: "IP" },
      ]);
    });

    it("rejects a facet whose label is not a string", () => {
      expect(parseFacets('[{"field":"ip","values":["10.0.0.1"],"title":42}]')).toEqual([]);
    });

    it("leaves an explicit regex operator alone", () => {
      expect(parseFacets('[{"field":"name","values":["^prod"],"op":"matches","regex":true}]')).toEqual([
        { field: "name", values: ["^prod"], op: "matches" },
      ]);
    });
  });

  describe("compileFacet", () => {
    it("matches any value in the facet, case-insensitively", () => {
      const facet: SearchFacet = { field: "name", values: ["nginx", "redis"] };

      expect(matches(facet, ["my-NGINX-pod"])).toBe(true);
      expect(matches(facet, ["redis-master"])).toBe(true);
      expect(matches(facet, ["postgres-0"])).toBe(false);
    });

    it("does not compile when the facet has no values", () => {
      expect(compileFacet({ field: "name", values: [] })).toBeUndefined();
    });

    it("defaults to contains when the facet carries no operator", () => {
      // Facets written before operators existed must keep their meaning.
      expect(matches({ field: "name", values: ["ngin"] }, ["my-nginx"])).toBe(true);
    });
  });

  describe("contains", () => {
    it("treats metacharacters literally", () => {
      expect(matches({ field: "name", values: ["^prod"], op: "contains" }, ["prod-api"])).toBe(false);
    });
  });

  describe("equals", () => {
    it("requires the whole text to match", () => {
      const facet: SearchFacet = { field: "namespace", values: ["default"], op: "equals" };

      expect(matches(facet, ["default"])).toBe(true);
      expect(matches(facet, ["default-2"])).toBe(false);
      expect(matches(facet, ["my-default"])).toBe(false);
    });

    it("is case-insensitive, like contains", () => {
      expect(matches({ field: "status", values: ["running"], op: "equals" }, ["Running"])).toBe(true);
    });

    it("matches any one of several values", () => {
      const facet: SearchFacet = { field: "status", values: ["Running", "Failed"], op: "equals" };

      expect(matches(facet, ["Failed"])).toBe(true);
      expect(matches(facet, ["Pending"])).toBe(false);
    });

    it("stays literal, so a pattern is not interpreted", () => {
      expect(matches({ field: "name", values: ["prod-\\w+"], op: "equals" }, ["prod-api"])).toBe(false);
    });
  });

  describe("matches", () => {
    it("applies the pattern", () => {
      const facet: SearchFacet = { field: "name", values: ["^prod"], op: "matches" };

      expect(matches(facet, ["prod-api"])).toBe(true);
      expect(matches(facet, ["my-prod-api"])).toBe(false);
    });

    // Anchoring by default would make the common case useless in a search box.
    it("is unanchored unless the pattern says otherwise", () => {
      expect(matches({ field: "name", values: ["ngin"], op: "matches" }, ["my-nginx-pod"])).toBe(true);
      expect(matches({ field: "name", values: ["^ngin$"], op: "matches" }, ["my-nginx-pod"])).toBe(false);
    });

    it("honours character classes, which lowercasing the source would break", () => {
      expect(matches({ field: "labels", values: ["^Team=[A-Z]"], op: "matches" }, ["Team=Platform"])).toBe(true);
    });

    it("honours alternation", () => {
      const facet: SearchFacet = { field: "name", values: ["^(staging|dev)-"], op: "matches" };

      expect(matches(facet, ["staging-api"])).toBe(true);
      expect(matches(facet, ["dev-api"])).toBe(true);
      expect(matches(facet, ["prod-api"])).toBe(false);
    });

    it("does not compile when every value is still an incomplete pattern", () => {
      expect(compileFacet({ field: "name", values: ["(", "[a-"], op: "matches" })).toBeUndefined();
    });

    it("keeps the usable half when only some values are incomplete", () => {
      const facet: SearchFacet = { field: "name", values: ["^prod", "("], op: "matches" };

      expect(matches(facet, ["prod-api"])).toBe(true);
      expect(matches(facet, ["dev-api"])).toBe(false);
    });

    it("skips absent texts instead of matching a phantom undefined", () => {
      expect(matches({ field: "ip", values: ["undefined"], op: "matches" }, [undefined, null])).toBe(false);
    });

    it("reuses one regex across texts without skipping matches", () => {
      const compiled = compileFacet({ field: "name", values: ["pod"], op: "matches" });

      expect(compiled?.test("pod-a")).toBe(true);
      expect(compiled?.test("pod-b")).toBe(true);
      expect(compiled?.test("pod-c")).toBe(true);
    });
  });

  describe("notContains", () => {
    it("excludes the texts that contain the value", () => {
      const facet: SearchFacet = { field: "name", values: ["api"], op: "notContains" };

      expect(matches(facet, ["prod-web"])).toBe(true);
      expect(matches(facet, ["prod-api"])).toBe(false);
    });

    // OR-ing negations would be true for almost everything, so a facet with
    // several values means "none of them".
    it("requires none of its values to be present", () => {
      const facet: SearchFacet = { field: "name", values: ["api", "web"], op: "notContains" };

      expect(matches(facet, ["prod-worker"])).toBe(true);
      expect(matches(facet, ["prod-web"])).toBe(false);
      expect(matches(facet, ["prod-api"])).toBe(false);
    });

    it("excludes an item when any one of a field's texts matches", () => {
      // Labels yield several texts; one hit is enough to exclude the item.
      const facet: SearchFacet = { field: "labels", values: ["app=web"], op: "notContains" };

      expect(matches(facet, ["env=prod", "app=api"])).toBe(true);
      expect(matches(facet, ["env=prod", "app=web"])).toBe(false);
    });
  });

  describe("notEquals", () => {
    it("keeps texts that merely contain the value", () => {
      const facet: SearchFacet = { field: "namespace", values: ["default"], op: "notEquals" };

      expect(matches(facet, ["default"])).toBe(false);
      expect(matches(facet, ["default-2"])).toBe(true);
    });

    it("keeps an item whose field is absent", () => {
      // Nothing without a status is "Running", so excluding Running keeps it.
      expect(matches({ field: "status", values: ["Running"], op: "notEquals" }, [undefined])).toBe(true);
    });
  });

  describe("notMatches", () => {
    it("excludes the texts the pattern matches", () => {
      const facet: SearchFacet = { field: "name", values: ["^prod"], op: "notMatches" };

      expect(matches(facet, ["staging-api"])).toBe(true);
      expect(matches(facet, ["prod-api"])).toBe(false);
    });

    it("does not compile while the pattern is incomplete, so nothing is excluded", () => {
      expect(compileFacet({ field: "name", values: ["^(prod"], op: "notMatches" })).toBeUndefined();
    });
  });

  describe("withFacetValue", () => {
    it("adds a facet for a field that has none", () => {
      expect(withFacetValue([], "name", "contains", "nginx")).toEqual([
        { field: "name", op: "contains", values: ["nginx"] },
      ]);
    });

    it("ORs a second value into the same field and operator", () => {
      const facets = withFacetValue(
        [{ field: "name", op: "contains", values: ["nginx"] }],
        "name",
        "contains",
        "redis",
      );

      expect(facets).toEqual([{ field: "name", op: "contains", values: ["nginx", "redis"] }]);
    });

    it("ignores a repeated value, which would render as an indistinguishable chip", () => {
      const facets = withFacetValue(
        [{ field: "name", op: "contains", values: ["nginx"] }],
        "name",
        "contains",
        "nginx",
      );

      expect(facets).toEqual([{ field: "name", op: "contains", values: ["nginx"] }]);
    });

    it("keeps other fields as separate facets", () => {
      const facets = withFacetValue(
        [{ field: "name", op: "contains", values: ["nginx"] }],
        "namespace",
        "contains",
        "default",
      );

      expect(facets.map(({ field }) => field)).toEqual(["name", "namespace"]);
    });

    // Merging them would change what either one means.
    it("keeps two operators on the same field as separate facets", () => {
      const facets = withFacetValue(
        [{ field: "name", op: "contains", values: ["prod"] }],
        "name",
        "notContains",
        "canary",
      );

      expect(facets).toEqual([
        { field: "name", op: "contains", values: ["prod"] },
        { field: "name", op: "notContains", values: ["canary"] },
      ]);
    });

    // The linked search carries facets onto views that do not have the field,
    // where the chip would otherwise fall back to the raw id and read as a bug.
    it("stores the label the facet was created with", () => {
      expect(withFacetValue([], "ip", "equals", "10.0.0.1", "IP")).toEqual([
        { field: "ip", op: "equals", values: ["10.0.0.1"], title: "IP" },
      ]);
    });

    it("keeps the stored label when a second value is added without one", () => {
      const facets = withFacetValue(
        [{ field: "ip", op: "contains", values: ["10.0.0.1"], title: "IP" }],
        "ip",
        "contains",
        "10.0.0.2",
      );

      expect(facets).toEqual([{ field: "ip", op: "contains", values: ["10.0.0.1", "10.0.0.2"], title: "IP" }]);
    });

    it("treats a missing operator as contains when grouping", () => {
      const facets = withFacetValue([{ field: "name", values: ["nginx"] }], "name", "contains", "redis");

      expect(facets).toEqual([{ field: "name", op: "contains", values: ["nginx", "redis"] }]);
    });
  });

  describe("withoutFacet", () => {
    it("drops the whole facet for a field and operator", () => {
      const facets: SearchFacet[] = [
        { field: "name", op: "contains", values: ["nginx", "redis"] },
        { field: "namespace", op: "contains", values: ["default"] },
      ];

      expect(withoutFacet(facets, "name", "contains")).toEqual([
        { field: "namespace", op: "contains", values: ["default"] },
      ]);
    });

    it("leaves the other operator on the same field alone", () => {
      const facets: SearchFacet[] = [
        { field: "name", op: "contains", values: ["prod"] },
        { field: "name", op: "notContains", values: ["canary"] },
      ];

      expect(withoutFacet(facets, "name", "contains")).toEqual([
        { field: "name", op: "notContains", values: ["canary"] },
      ]);
    });

    it("leaves the set alone for a field that has no facet", () => {
      const facets: SearchFacet[] = [{ field: "name", op: "contains", values: ["nginx"] }];

      expect(withoutFacet(facets, "namespace", "contains")).toEqual(facets);
    });
  });
});
