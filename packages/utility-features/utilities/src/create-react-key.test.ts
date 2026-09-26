/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createReactKey } from "./create-react-key";

// The algorithm is not part of the contract, so these tests check the format,
// stability and distinctness of the keys, never an exact value.
describe("createReactKey", () => {
  it.each([
    ["an object", { apiVersion: "helm.toolkit.fluxcd.io/v2", kind: "HelmRelease", spec: { chart: "podinfo" } }],
    ["an array", [1, "two", { three: 3 }, null]],
    ["a string", "podinfo"],
    ["a non-ASCII string", "Grüße 😀 café — 日本語"],
    ["an empty string", ""],
    ["a number", 42],
    ["null", null],
  ])("returns 16 lowercase hex characters for %s", (_, data) => {
    expect(createReactKey(data)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns the same key for equal input", () => {
    expect(createReactKey({ a: 1, b: [2, 3] })).toBe(createReactKey({ a: 1, b: [2, 3] }));
    expect(createReactKey("Grüße 😀")).toBe(createReactKey("Grüße 😀"));
  });

  it.each([
    ["different strings", "podinfo", "podinfp"],
    ["different non-ASCII strings", "Grüße 😀", "Grüße 😁"],
    ["a string and its JSON", "1", 1],
    ["different values in an object", { a: 1 }, { a: 2 }],
    ["a different key order in an object", { a: 1, b: 2 }, { b: 2, a: 1 }],
  ])("returns different keys for %s", (_, left, right) => {
    expect(createReactKey(left)).not.toBe(createReactKey(right));
  });

  it("returns distinct keys for many similar inputs", () => {
    const keys = new Set(Array.from({ length: 10_000 }, (_, i) => createReactKey({ name: `release-${i}` })));

    expect(keys.size).toBe(10_000);
  });

  it.each([
    ["undefined", undefined],
    ["a function", () => {}],
    ["a symbol", Symbol("key")],
  ])("throws a TypeError for %s", (_, data) => {
    expect(() => createReactKey(data)).toThrow(TypeError);
  });
});
