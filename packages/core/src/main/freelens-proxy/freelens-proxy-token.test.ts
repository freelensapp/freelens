/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { tokenMatches } from "./freelens-proxy-token";

describe("tokenMatches", () => {
  const token = "0123456789abcdef";

  it("accepts the same value", () => {
    expect(tokenMatches(token, token)).toBe(true);
  });

  it("rejects a different value of the same length", () => {
    expect(tokenMatches(token, "fedcba9876543210")).toBe(false);
  });

  it("rejects a value of another length", () => {
    expect(tokenMatches(token, `${token}0`)).toBe(false);
    expect(tokenMatches(token, token.slice(0, -1))).toBe(false);
  });

  it("rejects an empty or missing value", () => {
    expect(tokenMatches(token, "")).toBe(false);
    expect(tokenMatches(token, undefined)).toBe(false);
  });
});
