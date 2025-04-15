/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Ingress, computeRuleDeclarations } from "@freelensapp/kube-object";

describe("Ingress", () => {
  it("given no loadbalancer ingresses in status property, loadbalancers should be an empty array", () => {
    const ingress = new Ingress({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: "foo",
        resourceVersion: "1",
        uid: "bar",
        namespace: "default",
        selfLink: "/apis/networking.k8s.io/v1/ingresses/default/foo",
      },
      status: {
        loadBalancer: {},
      },
    });

    expect(ingress.getLoadBalancers()).toEqual([]);
  });

  it("given loadbalancer ingresses in status property, loadbalancers should be flat array of ip adresses and hostnames", () => {
    const ingress = new Ingress({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: "foo",
        resourceVersion: "1",
        uid: "bar",
        namespace: "default",
        selfLink: "/apis/networking.k8s.io/v1/ingresses/default/foo",
      },
      status: {
        loadBalancer: {
          ingress: [
            {
              ip: "10.0.0.27",
            },
            {
              hostname: "localhost",
            },
          ],
        },
      },
    });

    expect(ingress.getLoadBalancers()).toEqual(["10.0.0.27", "localhost"]);
  });
});

describe("computeRuleDeclarations", () => {
  it("given no tls field, should format links as http://", () => {
    const ingress = new Ingress({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: "foo",
        resourceVersion: "1",
        uid: "bar",
        namespace: "default",
        selfLink: "/apis/networking.k8s.io/v1/ingresses/default/foo",
      },
    });

    const result = computeRuleDeclarations(ingress, {
      host: "foo.bar",
      http: {
        paths: [
          {
            pathType: "Exact",
            backend: {
              service: {
                name: "my-service",
                port: {
                  number: 8080,
                },
              },
            },
          },
        ],
      },
    });

    expect(result[0].url).toBe("http://foo.bar/");
  });

  it("given no tls entries, should format links as http://", () => {
    const ingress = new Ingress({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: "foo",
        resourceVersion: "1",
        uid: "bar",
        namespace: "default",
        selfLink: "/apis/networking.k8s.io/v1/ingresses/default/foo",
      },
    });

    ingress.spec = {
      tls: [],
    };

    const result = computeRuleDeclarations(ingress, {
      host: "foo.bar",
      http: {
        paths: [
          {
            pathType: "Exact",
            backend: {
              service: {
                name: "my-service",
                port: {
                  number: 8080,
                },
              },
            },
          },
        ],
      },
    });

    expect(result[0].url).toBe("http://foo.bar/");
  });

  it("given some tls entries, should format links as https://", () => {
    const ingress = new Ingress({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: "foo",
        resourceVersion: "1",
        uid: "bar",
        namespace: "default",
        selfLink: "/apis/networking.k8s.io/v1/ingresses/default/foo",
      },
    });

    ingress.spec = {
      tls: [
        {
          secretName: "my-secret",
        },
      ],
    };

    const result = computeRuleDeclarations(ingress, {
      host: "foo.bar",
      http: {
        paths: [
          {
            pathType: "Exact",
            backend: {
              service: {
                name: "my-service",
                port: {
                  number: 8080,
                },
              },
            },
          },
        ],
      },
    });

    expect(result[0].url).toBe("https://foo.bar/");
  });
});
