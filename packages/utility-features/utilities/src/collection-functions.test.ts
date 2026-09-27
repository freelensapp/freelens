/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { strictGet, strictSet } from "./collection-functions";

describe("strictGet", () => {
  it("returns the value behind a present key", () => {
    expect(strictGet(new Map([["a", 1]]), "a")).toBe(1);
  });

  it.each([
    ["a string key", "missing", "'missing'"],
    ["a number key", 42, "42"],
    ["a bigint key", 42n, "42n"],
    ["an undefined key", undefined, "undefined"],
    ["a null key", null, "null"],
    ["a symbol key", Symbol("s"), "Symbol(s)"],
    ["an object key", { id: 1 }, '{"id":1}'],
    ["a function key", function named() {}, "[Function: named]"],
  ])("throws a TypeError naming %s", (_, key, formatted) => {
    expect(() => strictGet(new Map<unknown, number>(), key)).toThrow(
      new TypeError(`Map does not contains key: ${formatted}`),
    );
  });

  it("does not fail on a key that JSON cannot serialize", () => {
    const circular: Record<string, unknown> = {};

    circular.self = circular;

    expect(() => strictGet(new Map<unknown, number>(), circular)).toThrow(
      new TypeError("Map does not contains key: [object Object]"),
    );
  });
});

describe("strictSet", () => {
  it("sets a key that is not present", () => {
    const map = new Map<string, number>();

    strictSet(map, "a", 1);

    expect(map.get("a")).toBe(1);
  });

  it("throws a TypeError naming a key that is already present", () => {
    expect(() => strictSet(new Map([["a", 1]]), "a", 2)).toThrow(new TypeError("Map already contains key: 'a'"));
  });
});
