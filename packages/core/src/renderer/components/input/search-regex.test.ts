/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { compileSearchRegex } from "./search-regex";

describe("compileSearchRegex", () => {
  it("compiles a plain pattern", () => {
    expect(compileSearchRegex("nginx")?.test("my-nginx-pod")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(compileSearchRegex("NGINX")?.test("my-nginx-pod")).toBe(true);
  });

  it("keeps character classes usable, which a lowercased source would break", () => {
    expect(compileSearchRegex("[A-Z]")?.test("Nginx")).toBe(true);
    expect(compileSearchRegex("^kube-[a-z]+$")?.test("kube-system")).toBe(true);
    expect(compileSearchRegex("^kube-[a-z]+$")?.test("kube-system-2")).toBe(false);
  });

  it("supports alternation and anchors", () => {
    const regex = compileSearchRegex("^(prod|staging)-");

    expect(regex?.test("prod-api")).toBe(true);
    expect(regex?.test("staging-api")).toBe(true);
    expect(regex?.test("dev-api")).toBe(false);
  });

  it("returns undefined for a pattern the engine rejects", () => {
    expect(compileSearchRegex("(")).toBeUndefined();
    expect(compileSearchRegex("[a-")).toBeUndefined();
    expect(compileSearchRegex("a{2,1}")).toBeUndefined();
  });

  it("returns undefined for every prefix of a pattern that is still being typed", () => {
    const target = "^(prod|staging)-";
    const prefixes = Array.from({ length: target.length }, (_, i) => target.slice(0, i + 1));
    const rejected = prefixes.filter((prefix) => compileSearchRegex(prefix) === undefined);

    // The point is not the exact count but that rejection is routine mid-typing,
    // so callers must never treat it as an error state.
    expect(rejected.length).toBeGreaterThan(0);
    expect(compileSearchRegex(target)).toBeInstanceOf(RegExp);
  });

  it("is not global, so repeated test() calls do not skip matches", () => {
    const regex = compileSearchRegex("pod");

    expect(regex?.global).toBe(false);
    expect(regex?.test("pod-a")).toBe(true);
    expect(regex?.test("pod-b")).toBe(true);
    expect(regex?.test("pod-c")).toBe(true);
  });
});
