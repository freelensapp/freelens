/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { NO_PROMETHEUS_SERVICE_FOUND_MESSAGE } from "../../cluster/prometheus-handler/prometheus-handler";

import type { MetricsErrorInfo } from "../../../common/k8s-api/endpoints/metrics.api";

export const METRICS_NOT_AVAILABLE_MESSAGE = "Metrics not available";

export interface MetricsErrorDescription {
  query: string;
  status?: number;
  response?: string;
  message?: string;
}

export async function describeError(query: string, error: unknown): Promise<MetricsErrorDescription> {
  if (!(error instanceof Error)) {
    return { query, message: String(error) };
  }

  const cause = error.cause as any;

  // Duck-type check for a Response
  const looksLikeResponse = cause && typeof cause.text === "function" && typeof cause.status === "number";

  if (looksLikeResponse) {
    try {
      const bodyText = await cause.text();

      if (bodyText) {
        return {
          query,
          status: cause.status,
          response: bodyText.trim(),
        };
      }
    } catch {
      // body already consumed or unreadable — fall through
    }
  }

  return { query, message: error.message };
}

const HTTP_STATUS_MIN = 100;
const HTTP_STATUS_MAX = 599;

function isHttpStatusCode(value: unknown): value is number {
  return typeof value === "number" && value >= HTTP_STATUS_MIN && value <= HTTP_STATUS_MAX;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Walks the `.cause` chain of an error (descending into array causes) looking
 * for the first numeric status-like property. `depth` bounds the walk so a
 * cyclical cause chain cannot cause infinite recursion.
 */
export function findStatusCode(error: unknown, depth = 4): number | undefined {
  if (depth < 0) {
    return undefined;
  }

  if (Array.isArray(error)) {
    for (const item of error) {
      const found = findStatusCode(item, depth - 1);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  if (!isPlainObject(error)) {
    return undefined;
  }

  for (const key of ["status", "statusCode", "code"]) {
    if (isHttpStatusCode(error[key])) {
      return error[key] as number;
    }
  }

  return findStatusCode((error as { cause?: unknown }).cause, depth - 1);
}

/**
 * Recursively converts an error (and its cause chain) into a JSON-safe plain
 * structure suitable for the winston logger. `depth` bounds the recursion so
 * a cyclical cause chain cannot cause infinite recursion.
 */
export function serializeErrorForLogging(error: unknown, depth = 4): unknown {
  if (depth < 0) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      cause: error.cause === undefined ? undefined : serializeErrorForLogging(error.cause, depth - 1),
    };
  }

  if (Array.isArray(error)) {
    return error.map((item) => serializeErrorForLogging(item, depth - 1));
  }

  if (isPlainObject(error)) {
    return error;
  }

  return String(error);
}

export function classifyMetricsRouteError(error: unknown): MetricsErrorInfo {
  if (error instanceof Error && error.message === NO_PROMETHEUS_SERVICE_FOUND_MESSAGE) {
    const causes = Array.isArray(error.cause) ? error.cause : [];
    const allAccessDenied =
      causes.length > 0 &&
      causes.every((cause) => {
        const status = findStatusCode(cause);

        return status === 401 || status === 403;
      });

    if (allAccessDenied) {
      return { reason: "access-denied", message: error.message, status: 403 };
    }

    return { reason: "not-found", message: error.message };
  }

  if (error instanceof Error && error.message === METRICS_NOT_AVAILABLE_MESSAGE) {
    const description = error.cause as MetricsErrorDescription | undefined;
    const message = description?.message ?? description?.response ?? error.message;

    if (description?.status === 401 || description?.status === 403) {
      return { reason: "access-denied", message, status: description.status };
    }

    return { reason: "error", message, status: description?.status };
  }

  return { reason: "error", message: error instanceof Error ? error.message : String(error) };
}

export function statusCodeFor(info: MetricsErrorInfo): number {
  if (info.status !== undefined) {
    return info.status;
  }

  switch (info.reason) {
    case "not-found":
      return 503;
    case "access-denied":
      return 403;
    case "error":
      return 500;
  }
}
