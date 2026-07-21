/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JsonApiErrorParsed } from "@freelensapp/json-api";

import type { MetricsErrorInfo, MetricsErrorReason } from "../../../common/k8s-api/endpoints/metrics.api";

const reasons: readonly MetricsErrorReason[] = ["not-found", "access-denied", "error"];

function isMetricsErrorInfo(value: unknown): value is MetricsErrorInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.message === "string" && reasons.includes(candidate.reason as MetricsErrorReason);
}

export function classifyMetricsError(error: unknown): MetricsErrorInfo {
  if (error instanceof JsonApiErrorParsed) {
    const body = error.data;

    return isMetricsErrorInfo(body) ? body : { reason: "error", message: error.toString() };
  }

  return { reason: "error", message: error instanceof Error ? error.message : String(error) };
}
