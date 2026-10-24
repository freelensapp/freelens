/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { countChangedLines } from "./changed-lines";

describe("changed lines (insertions plus deletions)", () => {
  it.each([
    ["", "", 0],
    ["a\n", "a\n", 0],
    ["a\n", "a\nb\n", 1],
    ["a\nb\nc\n", "a\nc\n", 1],
    ["a\nb\nc\n", "a\nx\nc\n", 2],
    ["a\nb\na\n", "a\na\n", 1],
    ["", "a\nb\n", 2],
    ["a\nb\n", "", 2],
    ["a\n", "a", 2],
    ["a\r\n", "a\n", 2],
    ["a\nb\n", "b\na\n", 2],
  ])("counts %j versus %j as %i", (before, after, expected) => {
    expect(countChangedLines(before, after)).toBe(expected);
  });

  it("does not count shifted unchanged lines as edits", () => {
    const baseline = Array.from({ length: 10000 }, (_, i) => `key-${i}: value\n`).join("");

    expect(countChangedLines(baseline, `inserted: value\n${baseline}`)).toBe(1);
  });
});
