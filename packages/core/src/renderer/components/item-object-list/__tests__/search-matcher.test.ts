/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { createSearchMatcher } from "../search-matcher";

describe("createSearchMatcher", () => {
  it("matches a substring regardless of case", () => {
    expect(createSearchMatcher("Ingress-Con")("nginx-ingress-controller")).toBe(true);
  });

  it("matches a value with dashes when the query has none", () => {
    expect(createSearchMatcher("nginxingress")("nginx-ingress-7d9f8")).toBe(true);
  });

  it("matches a value without dashes when the query has them", () => {
    expect(createSearchMatcher("nginx-ingress")("nginxingress-7d9f8")).toBe(true);
  });

  it("treats underscores like dashes", () => {
    expect(createSearchMatcher("nginx_ingress")("nginx-ingress-controller")).toBe(true);
  });

  it("matches non-string values", () => {
    expect(createSearchMatcher("80")(8080)).toBe(true);
  });

  it("matches a query of only separators literally", () => {
    const matchesSearch = createSearchMatcher("-");

    expect(matchesSearch("nginx-ingress")).toBe(true);
    expect(matchesSearch("nginxingress")).toBe(false);
  });

  it("does not match a value missing the query", () => {
    expect(createSearchMatcher("nginx-ingress")("nginx-gateway")).toBe(false);
  });
});
