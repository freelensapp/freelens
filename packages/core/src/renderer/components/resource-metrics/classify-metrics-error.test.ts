/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JsonApiErrorParsed } from "@freelensapp/json-api";
import { classifyMetricsError } from "./classify-metrics-error";

import type { MetricsErrorInfo } from "../../../common/k8s-api/endpoints/metrics.api";

describe("classifyMetricsError", () => {
  it("passes through a well-formed MetricsErrorInfo body", () => {
    const body: MetricsErrorInfo = { reason: "not-found", message: "No Prometheus service found", status: 503 };
    const error = new JsonApiErrorParsed(body as never, ["No Prometheus service found"]);

    expect(classifyMetricsError(error)).toBe(body);
  });

  it("falls back to a generic error for a malformed body", () => {
    const body = { message: "not quite right" } as never;
    const error = new JsonApiErrorParsed(body, ["not quite right"]);

    expect(classifyMetricsError(error)).toEqual({ reason: "error", message: error.toString() });
  });

  it("falls back to a generic error when the reason is unrecognized", () => {
    const body = { reason: "totally-unknown", message: "boom" } as never;
    const error = new JsonApiErrorParsed(body, ["boom"]);

    expect(classifyMetricsError(error)).toEqual({ reason: "error", message: error.toString() });
  });

  it("reports error with the message for a plain Error", () => {
    expect(classifyMetricsError(new Error("network exploded"))).toEqual({
      reason: "error",
      message: "network exploded",
    });
  });

  it("reports error with a stringified value for a non-Error", () => {
    expect(classifyMetricsError("boom")).toEqual({ reason: "error", message: "boom" });
  });
});
