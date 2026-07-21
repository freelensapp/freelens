/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { NO_PROMETHEUS_SERVICE_FOUND_MESSAGE } from "../../cluster/prometheus-handler/prometheus-handler";
import {
  classifyMetricsRouteError,
  findStatusCode,
  METRICS_NOT_AVAILABLE_MESSAGE,
  serializeErrorForLogging,
  statusCodeFor,
} from "./metrics-error-classification";

class ApiExceptionStub extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}

describe("classifyMetricsRouteError", () => {
  it("reports access-denied when every provider failed to detect Prometheus with a 401/403", () => {
    const error = new Error(NO_PROMETHEUS_SERVICE_FOUND_MESSAGE, {
      cause: [
        new Error('Failed to find Prometheus provider for "lens"', { cause: new ApiExceptionStub(403, "Forbidden") }),
        new Error('Failed to find Prometheus provider for "helm"', {
          cause: new ApiExceptionStub(401, "Unauthorized"),
        }),
      ],
    });

    expect(classifyMetricsRouteError(error)).toEqual({
      reason: "access-denied",
      message: NO_PROMETHEUS_SERVICE_FOUND_MESSAGE,
      status: 403,
    });
  });

  it("reports not-found when detection failures are not uniformly access-denied", () => {
    const error = new Error(NO_PROMETHEUS_SERVICE_FOUND_MESSAGE, {
      cause: [
        new Error('Failed to find Prometheus provider for "lens"', { cause: new ApiExceptionStub(403, "Forbidden") }),
        new Error('Failed to find Prometheus provider for "helm"', { cause: new ApiExceptionStub(500, "boom") }),
      ],
    });

    expect(classifyMetricsRouteError(error)).toEqual({
      reason: "not-found",
      message: NO_PROMETHEUS_SERVICE_FOUND_MESSAGE,
    });
  });

  it("reports not-found when the cause list is empty", () => {
    const error = new Error(NO_PROMETHEUS_SERVICE_FOUND_MESSAGE, { cause: [] });

    expect(classifyMetricsRouteError(error)).toEqual({
      reason: "not-found",
      message: NO_PROMETHEUS_SERVICE_FOUND_MESSAGE,
    });
  });

  it("reports access-denied when a query failed with a 403", () => {
    const error = new Error(METRICS_NOT_AVAILABLE_MESSAGE, {
      cause: { query: "up", status: 403, response: "Forbidden" },
    });

    expect(classifyMetricsRouteError(error)).toEqual({
      reason: "access-denied",
      message: "Forbidden",
      status: 403,
    });
  });

  it("reports error with the original status when a query failed for another reason", () => {
    const error = new Error(METRICS_NOT_AVAILABLE_MESSAGE, {
      cause: { query: "up", status: 422, response: "Unprocessable" },
    });

    expect(classifyMetricsRouteError(error)).toEqual({
      reason: "error",
      message: "Unprocessable",
      status: 422,
    });
  });

  it("reports error for an unrelated Error", () => {
    expect(classifyMetricsRouteError(new Error("boom"))).toEqual({
      reason: "error",
      message: "boom",
    });
  });

  it("reports error for a non-Error value", () => {
    expect(classifyMetricsRouteError("boom")).toEqual({
      reason: "error",
      message: "boom",
    });
  });
});

describe("findStatusCode", () => {
  it("finds a status via .code", () => {
    expect(findStatusCode({ code: 404 })).toBe(404);
  });

  it("finds a status via .status", () => {
    expect(findStatusCode({ status: 401 })).toBe(401);
  });

  it("finds a status via .statusCode", () => {
    expect(findStatusCode({ statusCode: 500 })).toBe(500);
  });

  it("walks nested causes to find the status", () => {
    const outer = new Error("outer", { cause: new Error("middle", { cause: new ApiExceptionStub(403, "Forbidden") }) });

    expect(findStatusCode(outer)).toBe(403);
  });

  it("ignores out-of-range numbers", () => {
    expect(findStatusCode({ code: 9000 })).toBeUndefined();
  });

  it("does not walk past the depth limit", () => {
    let deep: unknown = { code: 500 };

    for (let i = 0; i < 6; i += 1) {
      deep = { cause: deep };
    }

    expect(findStatusCode(deep, 4)).toBeUndefined();
    expect(findStatusCode(deep, 10)).toBe(500);
  });
});

describe("serializeErrorForLogging", () => {
  it("serializes an Error and its cause", () => {
    const error = new Error("outer", { cause: new Error("inner") });

    expect(serializeErrorForLogging(error)).toEqual({
      message: "outer",
      cause: { message: "inner", cause: undefined },
    });
  });

  it("serializes an Error whose cause is an array of errors", () => {
    const error = new Error("outer", { cause: [new Error("a"), new Error("b")] });

    expect(serializeErrorForLogging(error)).toEqual({
      message: "outer",
      cause: [
        { message: "a", cause: undefined },
        { message: "b", cause: undefined },
      ],
    });
  });

  it("passes plain objects through and stringifies primitives", () => {
    expect(serializeErrorForLogging({ some: "value" })).toEqual({ some: "value" });
    expect(serializeErrorForLogging("plain string")).toBe("plain string");
    expect(serializeErrorForLogging(42)).toBe("42");
  });

  it("stops recursing once the depth limit is exhausted", () => {
    let deepest: Error = new Error("level-0");

    for (let i = 1; i <= 6; i += 1) {
      deepest = new Error(`level-${i}`, { cause: deepest });
    }

    const serialized = serializeErrorForLogging(deepest, 2) as {
      cause: { cause: { cause: unknown; message: string } };
    };

    expect(serialized.cause.cause.message).toBe("level-4");
    expect(serialized.cause.cause.cause).toBeUndefined();
  });
});

describe("statusCodeFor", () => {
  it("prefers an explicit status when present", () => {
    expect(statusCodeFor({ reason: "error", message: "boom", status: 422 })).toBe(422);
  });

  it("defaults not-found to 503", () => {
    expect(statusCodeFor({ reason: "not-found", message: "boom" })).toBe(503);
  });

  it("defaults access-denied to 403", () => {
    expect(statusCodeFor({ reason: "access-denied", message: "boom" })).toBe(403);
  });

  it("defaults error to 500", () => {
    expect(statusCodeFor({ reason: "error", message: "boom" })).toBe(500);
  });
});
