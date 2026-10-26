/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { kustomizeHash } from "./kustomize-hash";

import type { KustomizeHashResource } from "./kustomize-hash";

describe("kustomizeHash", () => {
  // The vectors of `TestConfigMapHash` in kustomize's api/hasher/hasher_test.go.
  it.each<[string, KustomizeHashResource, string]>([
    ["empty data", { kind: "ConfigMap" }, "6ct58987ht"],
    ["one key", { kind: "ConfigMap", data: { one: "" } }, "9g67k2htb6"],
    ["three keys", { kind: "ConfigMap", data: { two: 2, one: "", three: 3 } }, "7757f9kkct"],
    ["one key with binary data", { kind: "ConfigMap", binaryData: { one: "" } }, "6mtk2m274t"],
    ["three keys with binary data", { kind: "ConfigMap", binaryData: { two: 2, one: "", three: 3 } }, "9th7kc28dg"],
    ["two keys with one each", { kind: "ConfigMap", data: { one: "" }, binaryData: { two: "" } }, "698h7c7t9m"],
  ])("reproduces kustomize for a ConfigMap with %s", (_, resource, hash) => {
    expect(kustomizeHash(resource)).toBe(hash);
  });

  // The vectors of `TestSecretHash` in kustomize's api/hasher/hasher_test.go.
  it.each<[string, KustomizeHashResource, string]>([
    ["empty data", { kind: "Secret", type: "my-type" }, "5gmgkf8578"],
    ["one key", { kind: "Secret", type: "my-type", data: { one: "" } }, "74bd68bm66"],
    ["three keys", { kind: "Secret", type: "my-type", data: { two: 2, one: "", three: 3 } }, "4gf75c7476"],
    ["string data", { kind: "Secret", type: "my-type", data: { one: "" }, stringData: { two: 2 } }, "c4h4264gdb"],
  ])("reproduces kustomize for a Secret with %s", (_, resource, hash) => {
    expect(kustomizeHash(resource)).toBe(hash);
  });

  // Computed by `hasher.Hasher.Hash` of sigs.k8s.io/kustomize/api v0.21.1 for
  // the same resources written as YAML.
  it.each<[string, KustomizeHashResource, string]>([
    [
      "`<`, `>` and `&` in a value",
      { kind: "ConfigMap", metadata: { name: "app-config" }, data: { query: "a < b && c > d" } },
      "5d5fgfc647",
    ],
    [
      "U+2028, U+2029 and keys that sort differently by code point and by UTF-16 code unit",
      {
        kind: "Secret",
        metadata: { name: "app-secret" },
        type: "Opaque",
        data: { z: "\u2028\u2029", a: "<&>" },
        stringData: { é: "x", "😀": "y", "～": "z" },
      },
      "669462h8kc",
    ],
    [
      "quotes, backslashes, control characters and non-ASCII in a value",
      { kind: "ConfigMap", metadata: { name: "nested" }, data: { b: 'Grüße "quoted" \\ \t\n', a: "x" } },
      "4kb799b6d2",
    ],
    [
      "numbers and a boolean",
      { kind: "ConfigMap", metadata: { name: "numeric" }, data: { big: 1e21, small: 0.0000001, frac: 1.5, t: true } },
      "76k6bhg66g",
    ],
  ])("reproduces kustomize for %s", (_, resource, hash) => {
    expect(kustomizeHash(resource)).toBe(hash);
  });

  // The suffixes kustomize v0.21.1 `krusty` gave these generators:
  //
  //   configMapGenerator:
  //   - name: app-config
  //     literals: ["query=a < b && c > d"]
  //   - name: other-name
  //     literals: ["query=a < b && c > d"]
  //   secretGenerator:
  //   - name: app-secret
  //     type: Opaque
  //     literals: ["a=<&>"]
  it.each<[string, KustomizeHashResource, string]>([
    [
      "app-config-5d5fgfc647",
      { kind: "ConfigMap", metadata: { name: "app-config-5d5fgfc647" }, data: { query: "a < b && c > d" } },
      "5d5fgfc647",
    ],
    [
      "other-name-5d5fgfc647",
      { kind: "ConfigMap", metadata: { name: "other-name-5d5fgfc647" }, data: { query: "a < b && c > d" } },
      "5d5fgfc647",
    ],
    [
      "app-secret-t8dd8d42gk",
      { kind: "Secret", metadata: { name: "app-secret-t8dd8d42gk" }, type: "Opaque", data: { a: "PCY+" } },
      "t8dd8d42gk",
    ],
  ])("reproduces the suffix of the generated %s", (_, resource, hash) => {
    expect(kustomizeHash(resource)).toBe(hash);
  });

  it("does not depend on the name, as kustomize does not", () => {
    expect(kustomizeHash({ kind: "ConfigMap", metadata: { name: "a" } })).toBe(
      kustomizeHash({ kind: "ConfigMap", metadata: { name: "b" } }),
    );
  });

  it("depends on the data", () => {
    expect(kustomizeHash({ kind: "ConfigMap", data: { a: "1" } })).not.toBe(
      kustomizeHash({ kind: "ConfigMap", data: { a: "2" } }),
    );
  });

  it("does not depend on the key order of the data", () => {
    expect(kustomizeHash({ kind: "ConfigMap", data: { a: "1", b: "2" } })).toBe(
      kustomizeHash({ kind: "ConfigMap", data: { b: "2", a: "1" } }),
    );
  });

  it.each(["Deployment", "configmap", ""])("throws a TypeError for kind %j", (kind) => {
    expect(() => kustomizeHash({ kind })).toThrow(TypeError);
  });
});
