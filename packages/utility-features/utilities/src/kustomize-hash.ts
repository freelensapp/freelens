/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sha256Hex } from "./sha256";

/**
 * A ConfigMap or a Secret, in the shape the Kubernetes API returns it.
 */
export interface KustomizeHashResource {
  kind: string;
  metadata?: { name?: string };
  data?: Record<string, unknown>;
  binaryData?: Record<string, unknown>;
  stringData?: Record<string, unknown>;
  type?: string;
}

/**
 * Computes the name suffix kustomize gives a generated ConfigMap or Secret, so
 * that the object a generator produced can be found as `<name>-<hash>`.
 *
 * It reproduces `sigs.k8s.io/kustomize/api/hasher` exactly: the encoding of
 * the fields kustomize takes into account, the SHA-256 of it, and the first 10
 * hex characters with kustomize's letter substitutions.
 *
 * The name does not change the result. kustomize's encoding has a `name`
 * field, but it looks the name up as a single field literally called
 * `metadata/name`, never finds it, and so always encodes `""`: two generators
 * with the same data and different names get the same suffix.
 *
 * @param resource A ConfigMap or a Secret
 * @returns 10 characters, as kustomize appends them to the name
 * @throws {TypeError} if `resource.kind` is neither `ConfigMap` nor `Secret`,
 *   which kustomize hashes differently
 */
export function kustomizeHash(resource: KustomizeHashResource): string {
  // `getNodeValues`: a missing field becomes "", never null or {}. The name is
  // always missing to kustomize, as explained above.
  const name = "";
  const data = resource.data ?? "";
  let encoded: Record<string, unknown>;

  switch (resource.kind) {
    case "ConfigMap":
      encoded = { kind: "ConfigMap", name, data };

      if (isObject(resource.binaryData)) {
        encoded.binaryData = resource.binaryData;
      }
      break;
    case "Secret":
      encoded = { kind: "Secret", type: resource.type ?? "", name, data };

      if (isObject(resource.stringData)) {
        encoded.stringData = resource.stringData;
      }
      break;
    default:
      throw new TypeError(`kustomizeHash supports only ConfigMap and Secret, not ${String(resource.kind)}`);
  }

  return encode(sha256Hex(goJsonMarshal(encoded)));
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// kustomize's `encode`, which it copied from kubectl.
const substitutions: Partial<Record<string, string>> = { "0": "g", "1": "h", "3": "k", a: "m", e: "t" };

const encode = (hex: string) => hex.slice(0, 10).replace(/[013ae]/g, (ch) => substitutions[ch] ?? ch);

// Go's `encoding/json` escapes these for embedding in HTML, and
// `JSON.stringify` does not.
const goEscapes: Partial<Record<string, string>> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

// Go sorts map keys by their UTF-8 bytes, which is code point order.
// `Array.prototype.sort` compares UTF-16 code units, which differs when a
// character above U+FFFF meets one between U+E000 and U+FFFF.
const compareCodePoints = (left: string, right: string) => {
  const a = Array.from(left, (ch) => ch.codePointAt(0) as number);
  const b = Array.from(right, (ch) => ch.codePointAt(0) as number);

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }

  return a.length - b.length;
};

// What Go's `json.Marshal` gives for a value decoded from JSON: objects with
// their keys sorted at every level, and the HTML-sensitive characters escaped.
function goJsonMarshal(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(goJsonMarshal).join(",")}]`;
  }

  if (isObject(value)) {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort(compareCodePoints)
      .map((key) => `${goJsonMarshal(key)}:${goJsonMarshal(value[key])}`);

    return `{${entries.join(",")}}`;
  }

  return (JSON.stringify(value) ?? "null").replace(/[<>&\u2028\u2029]/g, (ch) => goEscapes[ch] ?? ch);
}
