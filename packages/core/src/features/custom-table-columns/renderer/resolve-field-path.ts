/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Parses a field path into an array of property keys.
 * 
 * Supports:
 * - Dot notation: "metadata.labels.app" → ["metadata", "labels", "app"]
 * - Bracket notation for keys with dots: "metadata.annotations['csi.volume.kubernetes.io/nodeid']"
 *   → ["metadata", "annotations", "csi.volume.kubernetes.io/nodeid"]
 * - Mixed: "metadata.labels['kubernetes.io/os']" → ["metadata", "labels", "kubernetes.io/os"]
 */
function parseFieldPath(path: string): string[] {
  const keys: string[] = [];
  let i = 0;

  while (i < path.length) {
    if (path[i] === ".") {
      i++;
      continue;
    }

    if (path[i] === "[") {
      // Bracket notation: find matching quote and closing bracket
      const quoteChar = path[i + 1];

      if (quoteChar === "'" || quoteChar === '"') {
        const closeQuote = path.indexOf(`${quoteChar}]`, i + 2);

        if (closeQuote === -1) break;
        keys.push(path.slice(i + 2, closeQuote));
        i = closeQuote + 2;
      } else {
        // Numeric index like [0]
        const closeBracket = path.indexOf("]", i + 1);

        if (closeBracket === -1) break;
        keys.push(path.slice(i + 1, closeBracket));
        i = closeBracket + 1;
      }
      continue;
    }

    // Dot notation: read until next dot or bracket
    const nextDot = path.indexOf(".", i);
    const nextBracket = path.indexOf("[", i);
    let end: number;

    if (nextDot === -1 && nextBracket === -1) {
      end = path.length;
    } else if (nextDot === -1) {
      end = nextBracket;
    } else if (nextBracket === -1) {
      end = nextDot;
    } else {
      end = Math.min(nextDot, nextBracket);
    }

    keys.push(path.slice(i, end));
    i = end;
  }

  return keys;
}

/**
 * Resolves a field path on a Kubernetes resource object.
 * 
 * Supports dot notation and bracket notation for keys containing dots.
 * 
 * @param obj - The resource object (e.g., a KubeObject instance)
 * @param path - Field path using dot or bracket notation
 * @returns The value at the path, or undefined if not found
 * 
 * @example
 * ```ts
 * resolveFieldPath(node, "metadata.labels.app"); // simple dot path
 * resolveFieldPath(node, "metadata.annotations['csi.volume.kubernetes.io/nodeid']"); // dotted key
 * resolveFieldPath(node, "status.phase"); // simple path
 * ```
 */
export function resolveFieldPath(obj: object, path: string): unknown {
  const keys = parseFieldPath(path);
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Formats a resolved field value for display in a table cell.
 * - Scalar values (string, number, boolean): returned as-is
 * - null/undefined: returned as empty string
 * - Objects/arrays: serialized to JSON string
 * 
 * @param value - The resolved value from resolveFieldPath
 * @returns A string suitable for display
 */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  // Complex values (objects/arrays) → JSON string
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
