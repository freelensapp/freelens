/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { classifyKubeRequest, parseKubeApiPath } from "./kube-request-policy";

describe("parseKubeApiPath", () => {
  it.each([
    [
      "/api/v1/namespaces/shop/pods/web-1/log",
      { resource: "pods", name: "web-1", namespace: "shop", subresource: "log" },
    ],
    [
      "/apis/apps/v1/namespaces/shop/deployments",
      { resource: "deployments.apps", name: undefined, namespace: "shop", subresource: undefined },
    ],
    [
      "/api/v1/nodes/node-1/proxy/metrics",
      { resource: "nodes", name: "node-1", namespace: undefined, subresource: "proxy" },
    ],
    ["/api/v1/namespaces/shop", { resource: "namespaces", name: "shop", namespace: undefined, subresource: undefined }],
    ["/api/v1/namespaces", { resource: "namespaces", name: undefined, namespace: undefined, subresource: undefined }],
    ["/version", {}],
    ["/apis", {}],
  ])("parses %s", (path, expected) => {
    expect(parseKubeApiPath(path)).toEqual(expected);
  });
});

describe("classifyKubeRequest", () => {
  it.each([
    ["GET", "/api/v1/namespaces/shop/pods"],
    ["GET", "/api/v1/namespaces/shop/pods/web-1/log?previous=true"],
    ["GET", "/apis/apps/v1/deployments?watch=true"],
    ["GET", "/apis/events.k8s.io/v1/events"],
    ["HEAD", "/version"],
    ["GET", "/openapi/v3"],
    ["POST", "/apis/authorization.k8s.io/v1/selfsubjectaccessreviews"],
    ["POST", "/apis/authorization.k8s.io/v1/selfsubjectrulesreviews"],
    ["PATCH", "/apis/apps/v1/namespaces/shop/deployments/web?dryRun=All"],
  ])("lets %s %s through", (method, url) => {
    expect(classifyKubeRequest(method, url)).toEqual({ kind: "read" });
  });

  it.each([
    ["DELETE", "/api/v1/namespaces/shop/pods/web-1", "mutation", "delete pods web-1 in namespace shop"],
    ["DELETE", "/api/v1/namespaces/shop/pods?labelSelector=app%3Dweb", "mutation", "delete all pods in namespace shop"],
    [
      "POST",
      "/apis/authorization.k8s.io/v1/subjectaccessreviews",
      "mutation",
      "create subjectaccessreviews.authorization.k8s.io",
    ],
    [
      "POST",
      "/apis/rbac.authorization.k8s.io/v1/clusterrolebindings",
      "mutation",
      "create clusterrolebindings.rbac.authorization.k8s.io",
    ],
    ["PATCH", "/api/v1/nodes/node-1", "mutation", "patch nodes node-1"],
    [
      "PUT",
      "/apis/apps/v1/namespaces/shop/deployments/web/scale",
      "mutation",
      "replace deployments.apps web (scale) in namespace shop",
    ],
    [
      "PATCH",
      "/apis/apps/v1/namespaces/shop/deployments/web?dryRun=None",
      "mutation",
      "patch deployments.apps web in namespace shop",
    ],
    ["GET", "/api/v1/namespaces/shop/secrets", "secret", "read secrets in namespace shop"],
    ["GET", "/api/v1/namespaces/shop/pods/web-1/exec?command=sh", "interactive", "exec pods web-1 in namespace shop"],
    ["POST", "/api/v1/namespaces/shop/pods/web-1/attach", "interactive", "attach pods web-1 in namespace shop"],
    [
      "GET",
      "/api/v1/namespaces/shop/pods/web-1/portforward",
      "interactive",
      "portforward pods web-1 in namespace shop",
    ],
    ["GET", "/api/v1/namespaces/shop/services/web/proxy/admin", "interactive", "proxy services web in namespace shop"],
  ])("asks before %s %s", (method, url, reason, action) => {
    expect(classifyKubeRequest(method, url)).toEqual({ kind: "approval", reason, action });
  });

  it("asks before any upgrade, whatever its path", () => {
    expect(classifyKubeRequest("GET", "/api/v1/namespaces/shop/pods", true)).toMatchObject({
      kind: "approval",
      reason: "interactive",
    });
  });

  it("does not let an encoded path hide a subresource", () => {
    expect(classifyKubeRequest("GET", "/api/v1/namespaces/shop/pods/web-1/%65xec")).toMatchObject({
      kind: "approval",
      reason: "interactive",
    });
  });
});
