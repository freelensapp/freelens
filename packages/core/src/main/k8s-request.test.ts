/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import lensFetchInjectable from "./fetch/lens-fetch.injectable";
import { getDiForUnitTesting } from "./getDiForUnitTesting";
import k8sRequestInjectable from "./k8s-request.injectable";

import type { K8sRequest } from "./k8s-request.injectable";

const fakeResponse = (status: number, statusText: string, body: string, json: unknown = {}) =>
  ({
    status,
    statusText,
    text: async () => body,
    json: async () => json,
  }) as never;

describe("k8sRequest", () => {
  let k8sRequest: K8sRequest;
  let response: unknown;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(lensFetchInjectable, () => async () => response as never);

    k8sRequest = di.inject(k8sRequestInjectable);
  });

  it("returns the json of a successful response", async () => {
    response = fakeResponse(200, "OK", "", { gitVersion: "v1.33.0" });

    await expect(k8sRequest({ id: "some-cluster-id" }, "/version")).resolves.toEqual({ gitVersion: "v1.33.0" });
  });

  it("rejects a failed response with the status and the reason given by the proxy", async () => {
    const reason = "getting credentials: exec: executable kubelogin failed with exit code 1";

    response = fakeResponse(500, "Internal Server Error", `${reason}\n`);

    await expect(k8sRequest({ id: "some-cluster-id" }, "/version")).rejects.toMatchObject({
      statusCode: 500,
      error: reason,
      message: `Failed to get /version for clusterId=some-cluster-id: ${reason}`,
    });
  });

  it("falls back to the status text when the failed response has no body", async () => {
    response = fakeResponse(502, "Bad Gateway", "");

    await expect(k8sRequest({ id: "some-cluster-id" }, "/version")).rejects.toMatchObject({
      statusCode: 502,
      error: "Bad Gateway",
      message: "Failed to get /version for clusterId=some-cluster-id: Bad Gateway",
    });
  });
});
