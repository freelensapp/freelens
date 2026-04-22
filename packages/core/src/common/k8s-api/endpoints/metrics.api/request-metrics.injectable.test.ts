/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import apiBaseInjectable from "../../api-base.injectable";
import requestMetricsInjectable from "./request-metrics.injectable";

import type { RequestMetrics } from "./request-metrics.injectable";

describe("requestMetricsInjectable", () => {
  it.each([
    { end: 4 * 60 * 60, expectedStep: 60 },
    { end: 24 * 60 * 60, expectedStep: 600 },
    { end: 4 * 24 * 60 * 60, expectedStep: 3600 },
    { end: 14 * 24 * 60 * 60, expectedStep: 10800 },
    { end: 30 * 24 * 60 * 60, expectedStep: 21600 },
    { end: 30 * 24 * 60 * 60 + 1, expectedStep: 43200 },
  ])("sends an adaptive $expectedStep second step for range ending at $end seconds", async ({ end, expectedStep }) => {
    const { post, requestMetrics } = instantiateRequestMetrics();

    await requestMetrics("sum(rate(container_cpu_usage_seconds_total[5m]))", {
      start: 0,
      end,
    });

    expect(post).toHaveBeenCalledWith("/metrics", {
      data: "sum(rate(container_cpu_usage_seconds_total[5m]))",
      query: {
        start: 0,
        end,
        step: expectedStep,
        kubernetes_namespace: undefined,
      },
    });
  });

  it("calculates the adaptive step for valid string timestamps", async () => {
    const { post, requestMetrics } = instantiateRequestMetrics();
    const start = "2024-01-01T00:00:00Z";
    const end = "2024-01-06T00:00:00Z";

    await requestMetrics("sum(rate(container_cpu_usage_seconds_total[5m]))", {
      start,
      end,
    });

    expect(post).toHaveBeenCalledWith("/metrics", {
      data: "sum(rate(container_cpu_usage_seconds_total[5m]))",
      query: {
        start: 1704067200,
        end: 1704499200,
        step: 10800,
        kubernetes_namespace: undefined,
      },
    });
  });

  it("sends the explicit step override without adaptive recalculation", async () => {
    const { post, requestMetrics } = instantiateRequestMetrics();

    await requestMetrics("sum(rate(container_cpu_usage_seconds_total[5m]))", {
      start: 0,
      end: 40 * 24 * 60 * 60,
      step: 123,
    });

    expect(post).toHaveBeenCalledWith("/metrics", {
      data: "sum(rate(container_cpu_usage_seconds_total[5m]))",
      query: {
        start: 0,
        end: 40 * 24 * 60 * 60,
        step: 123,
        kubernetes_namespace: undefined,
      },
    });
  });

  it("dedupes identical concurrent requests while one network call is still in flight", async () => {
    const deferred = createDeferred<object>();
    const response = { result: "metrics" };
    const { post, requestMetrics } = instantiateRequestMetrics(jest.fn(() => deferred.promise));
    const params = { start: 0, end: 60 * 60 };

    const firstRequest = requestMetrics("sum(rate(container_cpu_usage_seconds_total[5m]))", params);
    const secondRequest = requestMetrics("sum(rate(container_cpu_usage_seconds_total[5m]))", params);

    expect(post).toHaveBeenCalledTimes(1);

    deferred.resolve(response);

    await expect(firstRequest).resolves.toBe(response);
    await expect(secondRequest).resolves.toBe(response);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("starts a new network request after an identical earlier request has already settled", async () => {
    const firstResponse = { result: "first" };
    const secondResponse = { result: "second" };
    const { post, requestMetrics } = instantiateRequestMetrics();
    const params = { start: 0, end: 60 * 60 };

    post.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

    await expect(requestMetrics("sum(rate(container_cpu_usage_seconds_total[5m]))", params)).resolves.toBe(
      firstResponse,
    );
    await expect(requestMetrics("sum(rate(container_cpu_usage_seconds_total[5m]))", params)).resolves.toBe(
      secondResponse,
    );
    expect(post).toHaveBeenCalledTimes(2);
  });
});

function instantiateRequestMetrics(post: jest.Mock = jest.fn().mockResolvedValue({})) {
  const requestMetrics = requestMetricsInjectable.instantiate({
    inject: (injectable: unknown) => {
      if (injectable === apiBaseInjectable) {
        return { post };
      }

      throw new Error(`Unexpected injectable: ${String(injectable)}`);
    },
  } as never) as RequestMetrics;

  return {
    post,
    requestMetrics,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}
