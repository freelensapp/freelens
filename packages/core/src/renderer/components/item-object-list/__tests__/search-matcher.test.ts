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

  it("matches dashes in the query literally", () => {
    const matchesSearch = createSearchMatcher("nginx-ingress");

    expect(matchesSearch("nginx-ingress-7d9f8")).toBe(true);
    expect(matchesSearch("nginxingress-7d9f8")).toBe(false);
  });

  it("matches a value with underscores when the query has none", () => {
    expect(createSearchMatcher("nginxingress")("nginx_ingress_controller")).toBe(true);
  });

  it("matches underscores in the query literally", () => {
    const matchesSearch = createSearchMatcher("nginx_ingress");

    expect(matchesSearch("nginx_ingress_controller")).toBe(true);
    expect(matchesSearch("nginx-ingress-controller")).toBe(false);
    expect(matchesSearch("nginxingress-controller")).toBe(false);
  });

  it.each([
    ["-0", "database-0", "database0"],
    ["-v2", "service-v2", "servicev2"],
    ["nginx-", "nginx-controller", "nginxcontroller"],
    ["_0", "database_0", "database0"],
    ["_v2", "service_v2", "servicev2"],
    ["nginx_", "nginx_controller", "nginxcontroller"],
  ])("preserves leading or trailing separators in query %s", (query, literalMatch, nonLiteralMatch) => {
    const matchesSearch = createSearchMatcher(query);

    expect(matchesSearch(literalMatch)).toBe(true);
    expect(matchesSearch(nonLiteralMatch)).toBe(false);
  });

  it("matches non-string values", () => {
    expect(createSearchMatcher("80")(8080)).toBe(true);
  });

  it.each(["-", "_", "-_"])("matches the separator-only query %s literally", (query) => {
    const matchesSearch = createSearchMatcher(query);

    expect(matchesSearch(`nginx${query}ingress`)).toBe(true);
    expect(matchesSearch("nginxingress")).toBe(false);
  });

  it("does not match a value missing the query", () => {
    expect(createSearchMatcher("nginx-ingress")("nginx-gateway")).toBe(false);
  });
});
