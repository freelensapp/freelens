/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { winstonLoggerInjectable } from "@freelensapp/logger";
import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import navigateInjectable from "./navigate.injectable";

import type { ObservableHistory, To } from "@freelensapp/routing";

import type winston from "winston";

import type { Navigate } from "./navigate.injectable";

describe("navigate", () => {
  let navigate: Navigate;
  let observableHistory: ObservableHistory<unknown>;
  let warn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    warn = vi.fn();

    di.override(
      winstonLoggerInjectable,
      () =>
        ({
          warn,
          debug: vi.fn(),
          error: vi.fn(),
          info: vi.fn(),
          silly: vi.fn(),
        }) as unknown as winston.Logger,
    );

    navigate = di.inject(navigateInjectable);
    observableHistory = di.inject(observableHistoryInjectionToken);
    navigate("/some/current/page");
  });

  describe.each<[string, To]>([
    ["a relative string", "gatewayclass?a=1#x"],
    ["a relative object", { pathname: "gatewayclass", search: "?a=1" }],
  ])("given %s", (_, location) => {
    beforeEach(() => {
      navigate(location);
    });

    it("warns that the pathname must be absolute, naming the location", () => {
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(location)));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("must be absolute"));
    });

    it("still navigates", () => {
      expect(observableHistory.location.pathname).toBe("gatewayclass");
      expect(observableHistory.location.search).toBe("?a=1");
    });
  });

  describe.each<[string, To, string]>([
    ["an absolute string", "/some/other/page?a=1", "/some/other/page?a=1"],
    ["an absolute object", { pathname: "/some/other/page", search: "?a=1" }, "/some/other/page?a=1"],
    ["a search-only string", "?a=1", "/some/current/page?a=1"],
    ["a search-only object", { search: "?a=1" }, "/some/current/page?a=1"],
    ["a hash-only string", "#x", "/some/current/page#x"],
    ["a hash-only object", { hash: "#x" }, "/some/current/page#x"],
  ])("given %s", (_, location, expectedPath) => {
    beforeEach(() => {
      navigate(location);
    });

    it("does not warn", () => {
      expect(warn).not.toHaveBeenCalled();
    });

    it("navigates", () => {
      expect(observableHistory.toString()).toBe(expectedPath);
    });
  });
});
