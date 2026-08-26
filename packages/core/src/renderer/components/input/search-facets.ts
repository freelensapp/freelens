/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { compileSearchRegex } from "./search-regex";

/** Field id standing for "look in every searchable field of the view". */
export const allFieldsId = "*";

/** A searchable field the box can offer as a facet, without its getter. */
export interface SearchFieldOption {
  id: string;
  title: string;
}

/**
 * How a facet compares its values against a field's texts.
 *
 * `=~` and `!~` take a regular expression; the rest are literal. `:` is the
 * substring match a search box wants as its default.
 */
export type FacetOperator = "contains" | "equals" | "matches" | "notContains" | "notEquals" | "notMatches";

export const facetOperators: { op: FacetOperator; title: string; symbol: string }[] = [
  { op: "contains", title: "contains", symbol: ":" },
  { op: "equals", title: "equals", symbol: "=" },
  { op: "matches", title: "matches regular expression", symbol: "=~" },
  { op: "notContains", title: "does not contain", symbol: "!:" },
  { op: "notEquals", title: "not equals", symbol: "!=" },
  { op: "notMatches", title: "does not match regular expression", symbol: "!~" },
];

export const defaultFacetOperator: FacetOperator = "contains";

const operatorTitles = new Map(facetOperators.map(({ op, title }) => [op, title]));
const operatorSymbols = new Map(facetOperators.map(({ op, symbol }) => [op, symbol]));

const negatedOperators = new Set<FacetOperator>(["notContains", "notEquals", "notMatches"]);
const exactOperators = new Set<FacetOperator>(["equals", "notEquals"]);
const regexOperators = new Set<FacetOperator>(["matches", "notMatches"]);

export const facetOperatorTitle = (op: FacetOperator | undefined) =>
  operatorTitles.get(op ?? defaultFacetOperator) ?? defaultFacetOperator;
export const facetOperatorSymbol = (op: FacetOperator | undefined) =>
  operatorSymbols.get(op ?? defaultFacetOperator) ?? ":";
export const isRegexOperator = (op: FacetOperator | undefined) => regexOperators.has(op ?? defaultFacetOperator);

/**
 * One committed search facet: the values inside a facet are OR-ed, and separate
 * facets are AND-ed.
 *
 * `op` is frozen when the facet is committed rather than read live, so a chip
 * keeps meaning what it meant when it was added even after the operator is
 * changed for the next one. It is optional so facets written by an older build
 * still parse, defaulting to `contains`.
 */
export interface SearchFacet {
  field: string;
  values: string[];
  op?: FacetOperator;
  /**
   * Label the facet was created with, used only when the current view does not
   * know the field - the linked search carries facets across views, and a chip
   * falling back to its raw id reads as a bug rather than as a deliberate
   * "not applicable here". A view that does know the field always wins, so a
   * renamed label never sticks; this is for display only and never filters.
   */
  title?: string;
}

/** A text of a single searchable field, as `ListLayoutSearchFilter` yields it. */
export type FacetText = string | number | undefined | null;

/**
 * A facet ready to run against items.
 *
 * `test` takes one text at a time rather than a whole array so callers can walk
 * an item's fields lazily and stop at the first hit. Materialising every text of
 * every field for every item is what makes a list of a few thousand pods feel
 * slow on each keystroke.
 */
export interface CompiledFacet {
  test: (text: FacetText) => boolean;
  /** When set, the facet holds only if *no* text passes `test`. */
  negated: boolean;
}

/** Two facets on the same field differ when their operators differ. */
export const facetKey = (facet: Pick<SearchFacet, "field" | "op">) =>
  `${facet.field}|${facet.op ?? defaultFacetOperator}`;

const isFacetOperator = (value: unknown): value is FacetOperator =>
  typeof value === "string" && operatorTitles.has(value as FacetOperator);

/** Reads an operator out of its URL param, falling back to the default. */
export const parseFacetOperator = (raw: string): FacetOperator => (isFacetOperator(raw) ? raw : defaultFacetOperator);

const isSearchFacet = (value: unknown): value is SearchFacet => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<SearchFacet>;

  return (
    typeof candidate.field === "string" &&
    Array.isArray(candidate.values) &&
    candidate.values.every((entry) => typeof entry === "string") &&
    (candidate.op === undefined || isFacetOperator(candidate.op)) &&
    (candidate.title === undefined || typeof candidate.title === "string")
  );
};

/**
 * Reads facets out of their URL param.
 *
 * Anything unparseable yields no facets rather than throwing: the param is
 * user-editable and survives in bookmarks across versions, so a malformed
 * value must degrade to "no facets", never break the view.
 */
export function parseFacets(raw: string): SearchFacet[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isSearchFacet)
      .filter((facet) => facet.values.length > 0)
      .map((facet) => {
        // Regex used to be a flag beside the operator instead of an operator of
        // its own. Translate rather than drop it, or a link from that build
        // would silently start matching literally.
        const legacyRegex = (facet as { regex?: unknown }).regex === true;
        const op = facet.op ?? defaultFacetOperator;

        if (!legacyRegex || isRegexOperator(op)) {
          return { field: facet.field, values: facet.values, op: facet.op, title: facet.title };
        }

        return {
          field: facet.field,
          values: facet.values,
          op: negatedOperators.has(op) ? ("notMatches" as const) : ("matches" as const),
          title: facet.title,
        };
      });
  } catch {
    return [];
  }
}

/** Writes facets to their URL param, collapsing an empty set to "". */
export function serializeFacets(facets: readonly SearchFacet[]): string {
  const usable = facets.filter((facet) => facet.values.length > 0);

  return usable.length > 0 ? JSON.stringify(usable) : "";
}

const normalize = (value: FacetText) => String(value).toLowerCase();

/**
 * Builds the matcher for one facet, compiling any regex exactly once instead of
 * per item per field.
 *
 * Returns undefined when the facet cannot currently match anything meaningful -
 * no values, or every value is a regex the engine rejects because the user is
 * still typing it. Callers treat that as "this facet filters nothing", which
 * keeps the list from blanking mid-keystroke.
 *
 * A field the view does not have yields no texts at all, so a positive operator
 * matches nothing and a negative one matches everything. That falls straight out
 * of negating the same predicate, and the chip stays visible either way.
 */
export function compileFacet(facet: SearchFacet): CompiledFacet | undefined {
  if (facet.values.length === 0) {
    return undefined;
  }

  const op = facet.op ?? defaultFacetOperator;
  const negated = negatedOperators.has(op);

  if (regexOperators.has(op)) {
    // Left unanchored: in a search box `=~ ngin` has to find `my-nginx`, and
    // `^`/`$` are there when anchoring is wanted.
    const regexes = facet.values.map(compileSearchRegex).filter((regex): regex is RegExp => regex !== undefined);

    if (regexes.length === 0) {
      return undefined;
    }

    return {
      negated,
      // Absent fields are skipped rather than stringified, so `.` or `un`
      // cannot match a phantom "undefined". Case is handled by the regex `i`
      // flag, so the source is left alone - lowercasing would break `[A-Z]`.
      test: (text) => text != null && regexes.some((regex) => regex.test(String(text))),
    };
  }

  const exact = exactOperators.has(op);
  const needles = facet.values.map(normalize);

  return {
    negated,
    test: exact
      ? (text) => {
          const normalized = normalize(text);

          return needles.some((needle) => normalized === needle);
        }
      : (text) => {
          const normalized = normalize(text);

          return needles.some((needle) => normalized.includes(needle));
        },
  };
}

/**
 * Adds a value to the facet for this field and operator, creating it if needed.
 *
 * The operator is part of the identity: `Name = x` and `Name != y` are two
 * chips, because merging them would change what either one means.
 */
export function withFacetValue(
  facets: readonly SearchFacet[],
  field: string,
  op: FacetOperator,
  value: string,
  title?: string,
): SearchFacet[] {
  const key = facetKey({ field, op });
  const existing = facets.find((facet) => facetKey(facet) === key);
  const others = facets.filter((facet) => facetKey(facet) !== key);

  // A repeated value would render as a duplicate chip that cannot be told apart
  // from its twin, and OR-ing a value with itself changes nothing anyway.
  const values = existing?.values.includes(value) ? existing.values : [...(existing?.values ?? []), value];

  return [...others, { field, op, values, title: title ?? existing?.title }];
}

/**
 * Drops one facet.
 *
 * A chip carries every value of its facet, so removing it removes the group.
 */
export function withoutFacet(facets: readonly SearchFacet[], field: string, op: FacetOperator): SearchFacet[] {
  const key = facetKey({ field, op });

  return facets.filter((facet) => facetKey(facet) !== key);
}
