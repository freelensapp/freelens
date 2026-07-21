/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import asyncFn from "@async-fn/vitest";
import { loggerInjectionToken } from "@freelensapp/logger";
import { NO_PROMETHEUS_SERVICE_FOUND_MESSAGE } from "../../cluster/prometheus-handler/prometheus-handler";
import prometheusHandlerInjectable from "../../cluster/prometheus-handler/prometheus-handler.injectable";
import getMetricsInjectable from "../../get-metrics.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import addMetricsRouteInjectable from "./add-metrics-route.injectable";

import type { Logger } from "@freelensapp/logger";

import type { AsyncFnMock } from "@async-fn/vitest";
import type { DiContainer } from "@ogre-tools/injectable";
import type { Mocked } from "vitest";

import type { Cluster } from "../../../common/cluster/cluster";
import type { PrometheusDetails } from "../../cluster/prometheus-handler/prometheus-handler";
import type { GetMetrics } from "../../get-metrics.injectable";

class ApiExceptionStub extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}

describe("add-metrics-route", () => {
  let di: DiContainer;
  let clusterStub: Cluster;
  let loggerMock: Mocked<Logger>;
  let getPrometheusDetailsMock: AsyncFnMock<() => Promise<PrometheusDetails>>;
  let getMetricsMock: AsyncFnMock<GetMetrics>;
  let callRoute: (payload: unknown) => Promise<unknown>;

  beforeEach(() => {
    di = getDiForUnitTesting();

    loggerMock = {
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
    };
    di.override(loggerInjectionToken, () => loggerMock);

    getPrometheusDetailsMock = asyncFn();
    di.override(prometheusHandlerInjectable, () => ({
      setupPrometheus: () => {},
      getPrometheusDetails: getPrometheusDetailsMock,
    }));

    getMetricsMock = asyncFn();
    di.override(getMetricsInjectable, () => getMetricsMock);

    clusterStub = {
      id: "some-cluster-id",
      preferences: {},
      metadata: {},
    } as unknown as Cluster;

    const route = di.inject(addMetricsRouteInjectable);

    callRoute = (payload: unknown) =>
      Promise.resolve(
        (route.handler as (request: unknown) => unknown)({
          cluster: clusterStub,
          params: {},
          path: route.path,
          payload,
          query: new URLSearchParams(),
          raw: { req: {}, res: {} },
        }),
      );
  });

  it("logs the classification reason and the serialized cause when Prometheus detection fails", async () => {
    const resultPromise = callRoute({});

    await getPrometheusDetailsMock.reject(
      new Error(NO_PROMETHEUS_SERVICE_FOUND_MESSAGE, {
        cause: [
          new Error('Failed to find Prometheus provider for "lens"', { cause: new ApiExceptionStub(403, "Forbidden") }),
          new Error('Failed to find Prometheus provider for "helm"', { cause: new ApiExceptionStub(500, "boom") }),
        ],
      }),
    );

    await resultPromise;

    expect(loggerMock.warn).toHaveBeenCalledTimes(1);

    const [message, meta] = loggerMock.warn.mock.calls[0] as [string, Record<string, unknown>];

    expect(message).toBe(
      `[METRICS-ROUTE]: failed to get metrics for clusterId=some-cluster-id: ${new Error(NO_PROMETHEUS_SERVICE_FOUND_MESSAGE)}`,
    );
    expect(meta.reason).toBe("not-found");
    expect(meta.cause).not.toBeInstanceOf(Error);
    expect(meta.cause).toMatchObject({
      message: NO_PROMETHEUS_SERVICE_FOUND_MESSAGE,
      cause: [
        { message: 'Failed to find Prometheus provider for "lens"', cause: { message: "Forbidden" } },
        { message: 'Failed to find Prometheus provider for "helm"', cause: { message: "boom" } },
      ],
    });
  });

  it("returns a 503 with a not-found error when Prometheus detection fails", async () => {
    const resultPromise = callRoute({});

    await getPrometheusDetailsMock.reject(
      new Error(NO_PROMETHEUS_SERVICE_FOUND_MESSAGE, {
        cause: [
          new Error('Failed to find Prometheus provider for "lens"', { cause: new ApiExceptionStub(500, "boom") }),
        ],
      }),
    );

    await expect(resultPromise).resolves.toEqual({
      statusCode: 503,
      error: { reason: "not-found", message: NO_PROMETHEUS_SERVICE_FOUND_MESSAGE },
    });
  });

  it("returns a 403 with an access-denied error when detection fails due to authorization", async () => {
    const resultPromise = callRoute({});

    await getPrometheusDetailsMock.reject(
      new Error(NO_PROMETHEUS_SERVICE_FOUND_MESSAGE, {
        cause: [
          new Error('Failed to find Prometheus provider for "lens"', { cause: new ApiExceptionStub(403, "Forbidden") }),
        ],
      }),
    );

    await expect(resultPromise).resolves.toEqual({
      statusCode: 403,
      error: { reason: "access-denied", message: NO_PROMETHEUS_SERVICE_FOUND_MESSAGE, status: 403 },
    });
  });

  it("returns a 503 with a not-found error when no Prometheus service could be located", async () => {
    const resultPromise = callRoute({});

    await getPrometheusDetailsMock.resolve({ prometheusPath: "", provider: undefined as never });

    await expect(resultPromise).resolves.toEqual({
      statusCode: 503,
      error: { reason: "not-found", message: NO_PROMETHEUS_SERVICE_FOUND_MESSAGE },
    });
  });

  it("returns the response unchanged on success", async () => {
    const resultPromise = callRoute("up");

    await getPrometheusDetailsMock.resolve({ prometheusPath: "/api/v1/prometheus", provider: undefined as never });
    await getMetricsMock.resolve({ status: "success", data: { resultType: "vector", result: [] } });

    await expect(resultPromise).resolves.toEqual({
      response: { status: "success", data: { resultType: "vector", result: [] } },
    });
  });
});
