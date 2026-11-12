/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { toClusterRoute } from "./cluster-route-redirect";

describe("the location of a redirect of the API server on the route of the cluster", () => {
  describe("given an API server at the root of its host", () => {
    const apiUrl = new URL("https://some-api-server:6443");

    it("puts a redirect of /api to /api/ on the route of a renderer", () => {
      expect(toClusterRoute({ location: "/api/", requestPath: "/api", apiUrl, routePrefix: "/api-kube" })).toBe(
        "/api-kube/api/",
      );
    });

    it("puts it on the route of the main process", () => {
      expect(toClusterRoute({ location: "/api/", requestPath: "/api", apiUrl, routePrefix: "/some-cluster-id" })).toBe(
        "/some-cluster-id/api/",
      );
    });

    it("keeps the query", () => {
      expect(
        toClusterRoute({
          location: "/api/?timeout=32s",
          requestPath: "/api?timeout=32s",
          apiUrl,
          routePrefix: "/api-kube",
        }),
      ).toBe("/api-kube/api/?timeout=32s");
    });

    it("resolves a location relative to the path of the request", () => {
      expect(
        toClusterRoute({
          location: "pods/",
          requestPath: "/api/v1/namespaces/default/pods",
          apiUrl,
          routePrefix: "/api-kube",
        }),
      ).toBe("/api-kube/api/v1/namespaces/default/pods/");
    });

    it("puts a location with the URL of the API server on the route of the cluster", () => {
      expect(
        toClusterRoute({
          location: "https://some-api-server:6443/apis/",
          requestPath: "/apis",
          apiUrl,
          routePrefix: "/api-kube",
        }),
      ).toBe("/api-kube/apis/");
    });

    it("leaves a redirect to another host as it is", () => {
      expect(
        toClusterRoute({
          location: "https://some-login-page/sign-in",
          requestPath: "/api",
          apiUrl,
          routePrefix: "/api-kube",
        }),
      ).toBeUndefined();
    });

    it("leaves a redirect to another port of the same host as it is", () => {
      expect(
        toClusterRoute({
          location: "https://some-api-server:8443/api/",
          requestPath: "/api",
          apiUrl,
          routePrefix: "/api-kube",
        }),
      ).toBeUndefined();
    });

    it("leaves a location it cannot read as it is", () => {
      expect(
        toClusterRoute({ location: "https://[not-a-host", requestPath: "/api", apiUrl, routePrefix: "/api-kube" }),
      ).toBeUndefined();
    });
  });

  describe("given an API server below a path of its host, as Rancher gives one", () => {
    const apiUrl = new URL("https://some-rancher/k8s/clusters/local");

    it("puts a location below that path on the route of the cluster, without the path", () => {
      expect(
        toClusterRoute({
          location: "/k8s/clusters/local/api/",
          requestPath: "/api",
          apiUrl,
          routePrefix: "/api-kube",
        }),
      ).toBe("/api-kube/api/");
    });

    it("resolves a location relative to the path of the request below that path", () => {
      expect(toClusterRoute({ location: "api/", requestPath: "/api", apiUrl, routePrefix: "/api-kube" })).toBe(
        "/api-kube/api/",
      );
    });

    it("puts the path itself on the root of the route of the cluster", () => {
      expect(
        toClusterRoute({ location: "/k8s/clusters/local", requestPath: "/", apiUrl, routePrefix: "/api-kube" }),
      ).toBe("/api-kube/");
    });

    it("leaves a location outside that path as it is", () => {
      expect(
        toClusterRoute({ location: "/dashboard/", requestPath: "/api", apiUrl, routePrefix: "/api-kube" }),
      ).toBeUndefined();
    });

    it("leaves a location that only starts with the same letters as the path as it is", () => {
      expect(
        toClusterRoute({
          location: "/k8s/clusters/local-other/api/",
          requestPath: "/api",
          apiUrl,
          routePrefix: "/api-kube",
        }),
      ).toBeUndefined();
    });
  });

  it("reads the path of an API server given with a trailing slash", () => {
    expect(
      toClusterRoute({
        location: "/k8s/clusters/local/api/",
        requestPath: "/api",
        apiUrl: new URL("https://some-rancher/k8s/clusters/local/"),
        routePrefix: "/api-kube",
      }),
    ).toBe("/api-kube/api/");
  });
});
