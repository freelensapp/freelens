/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JSONPath } from "@astronautlabs/jsonpath";
import { namedCaptures } from "./named-captures";

const slashDashSearch = /[/\\-]/g;
const pathByBareDots = /(?<=\w)\./;
const backSlash = /\\/g;
const kubectlOptionPrefix = /^\$?\.?(?<pathExpression>.*)/;
const sliceVersion = /\[]/g;
const tripleDotName = /\.\.\.(?<trailing>.)/g;
const trailingDotDot = /\.\.$/;

/**
 * The GO package that kubectl and kubernetes uses for its JSONpath implementation has some
 * shorthand conveniences that are not part of the official spec. This function tries to convert
 * those shorthands to the official spec.
 *
 * Known shorthands:
 * - Leading `$` is optional (but implied)
 * - The string `/` can be used without a leading `\` escapement
 * - The string `\.` is used to denote the "value of '.'" and not "next key"
 * - The string `-` can be used while not in quotes
 * - `[]` as shorthand for `[0]`
 * - Remove `..` at the end of a path, we will just format it slightly differently
 * - Allow `...foo` as well as `..foo`
 */
export function convertKubectlJsonPathToNodeJsonPath(jsonPath: string) {
  // Every part of the pattern is optional, so it matches anything and
  // `pathExpression` always participates
  const captures = namedCaptures<{ pathExpression: string }>(kubectlOptionPrefix, jsonPath);
  let start = "$";

  if (!captures) {
    return start;
  }

  let { pathExpression } = captures;

  pathExpression = splitOffBracketedSegments(pathExpression)
    .map((segment, index) => (segment.bracketed ? segment.text : convertBareSegment(segment.text, index === 0)))
    .join("");

  pathExpression = pathExpression.replace(trailingDotDot, "");
  pathExpression = pathExpression.replace(tripleDotName, "..$<trailing>");

  if (!pathExpression.startsWith("[")) {
    start += ".";
  }

  // strip '\' characters from the result
  return `${start}${pathExpression.replace(backSlash, "").replace(sliceVersion, "[0]")}`;
}

interface PathSegment {
  text: string;
  bracketed: boolean;
}

/**
 * Splits a path into the parts written in bracket notation and the parts written in dot notation.
 *
 * What is already inside brackets is a key, not a path, so it must survive untouched: a label key
 * such as `['kops.k8s.io/instancegroup']` holds both dots and a slash, and treating either as
 * something to convert would take the expression apart in the middle of the key.
 */
function splitOffBracketedSegments(pathExpression: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let bare = "";
  let index = 0;

  while (index < pathExpression.length) {
    if (pathExpression[index] !== "[") {
      bare += pathExpression[index];
      index += 1;
      continue;
    }

    if (bare) {
      segments.push({ text: bare, bracketed: false });
      bare = "";
    }

    let bracketed = "";
    let quote: string | undefined;
    let escaped = false;

    while (index < pathExpression.length) {
      const char = pathExpression[index];

      bracketed += char;
      index += 1;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (quote) {
        if (char === quote) {
          quote = undefined;
        }
      } else if (char === "'" || char === '"') {
        quote = char;
      } else if (char === "]") {
        break;
      }
    }

    segments.push({ text: bracketed, bracketed: true });
  }

  if (bare) {
    segments.push({ text: bare, bracketed: false });
  }

  return segments;
}

/**
 * Converts the keys of a dot notation part of a path to bracket notation, but only the keys that
 * hold a character which dot notation cannot express.
 */
function convertBareSegment(segment: string, isStartOfPath: boolean) {
  if (!segment.match(slashDashSearch)) {
    return segment;
  }

  const startsWithDot = segment.startsWith(".");
  const [first, ...rest] = (startsWithDot ? segment.slice(1) : segment).split(pathByBareDots);
  const converted = `${convertToIndexNotation(first, isStartOfPath && !startsWithDot)}${rest
    .map((value) => convertToIndexNotation(value))
    .join("")}`;

  return converted;
}

function convertToIndexNotation(key: string, firstItem = false) {
  if (key.match(slashDashSearch)) {
    return `['${key}']`;
  }

  // no illegal characters found, do not touch
  const prefix = firstItem ? "" : ".";

  return `${prefix}${key}`;
}

export function formatJSONValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(formatJSONValue).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

interface CompiledJsonPath {
  query: string;
  isSlice: boolean;
}

/**
 * Parsing an expression is the expensive part of `safeJSONPathValue`, and the same handful of
 * expressions are evaluated once per row of a list. Keep the compiled form around so that cost is
 * paid once per expression instead of once per cell.
 *
 * A failed parse is cached as `null` so a malformed expression warns once rather than once per row.
 */
const compiledJsonPaths = new Map<string, CompiledJsonPath | null>();

const maxCompiledJsonPaths = 500;

function compileJsonPath(path: string): CompiledJsonPath | null {
  const cached = compiledJsonPaths.get(path);

  if (cached !== undefined) {
    return cached;
  }

  let compiled: CompiledJsonPath | null = null;

  try {
    const parsedPath = JSONPath.parse(convertKubectlJsonPathToNodeJsonPath(path));
    const isSlice = parsedPath.some(
      (exp: any) => exp.expression.type === "slice" || exp.expression.type === "wildcard",
    );

    compiled = { query: JSONPath.stringify(parsedPath), isSlice };
  } catch (error) {
    console.warn("[JSON-PATH]: failed to parse jsonpath", error);
  }

  if (compiledJsonPaths.size >= maxCompiledJsonPaths) {
    compiledJsonPaths.clear();
  }

  compiledJsonPaths.set(path, compiled);

  return compiled;
}

/**
 * Whether an expression can be evaluated at all, for telling someone that what they typed is not a
 * path before it is saved and renders an empty cell on every row.
 */
export function isValidJSONPath(path: string): boolean {
  return compileJsonPath(path) !== null;
}

/**
 * This function is a safer version of `JSONPath.value(obj, path)` with untrusted jsonpath strings
 */
export function safeJSONPathValue(obj: object, path: string): unknown {
  const compiled = compileJsonPath(path);

  if (!compiled) {
    return undefined;
  }

  try {
    const value = JSONPath.query(obj, compiled.query, compiled.isSlice ? Infinity : 1);

    if (compiled.isSlice) {
      return value;
    }

    return value[0];
  } catch (error) {
    // something failed
    console.warn("[JSON-PATH]: failed to evaluate jsonpath", error);

    return undefined;
  }
}
