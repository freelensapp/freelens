/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { GatewayClass } from "./gateway-class";
import { Gateway } from "./gateway";
import { HTTPRoute } from "./http-route";
import { GRPCRoute } from "./grpc-route";
import { TCPRoute } from "./tcp-route";
import { TLSRoute } from "./tls-route";
import { UDPRoute } from "./udp-route";
import { BackendTLSPolicy } from "./backend-tls-policy";
import { BackendLBPolicy } from "./backend-lb-policy";

const baseMetadata = (selfLink: string, name = "test", namespace?: string) => ({
  name,
  namespace,
  uid: "uid-123",
  resourceVersion: "1",
  selfLink,
});

describe("GatewayAPI - Helper Methods", () => {
  describe("GatewayClass", () => {
    it("getControllerName() returns the controller name", () => {
      const gatewayClass = new GatewayClass({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "GatewayClass",
        metadata: baseMetadata("/apis/gateway.networking.k8s.io/v1/gatewayclasses/gw-class"),
        spec: {
          controllerName: "example.net/gateway-controller",
        },
      });

      expect(gatewayClass.getControllerName()).toBe("example.net/gateway-controller");
    });

    it("isAccepted() returns true when Accepted condition is True", () => {
      const gatewayClass = new GatewayClass({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "GatewayClass",
        metadata: baseMetadata("/apis/gateway.networking.k8s.io/v1/gatewayclasses/gw-class"),
        spec: {
          controllerName: "example.net/gateway-controller",
        },
        status: {
          conditions: [{ type: "Accepted", status: "True" }],
        },
      });

      expect(gatewayClass.isAccepted()).toBe(true);
    });
  });

  describe("Gateway", () => {
    it("getClassName() returns gatewayClassName", () => {
      const gateway = new Gateway({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "Gateway",
        metadata: baseMetadata("/apis/gateway.networking.k8s.io/v1/namespaces/default/gateways/gw", "gw", "default"),
        spec: {
          gatewayClassName: "example-gw-class",
        },
      });

      expect(gateway.getClassName()).toBe("example-gw-class");
    });

    it("getAddresses() returns status addresses", () => {
      const gateway = new Gateway({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "Gateway",
        metadata: baseMetadata("/apis/gateway.networking.k8s.io/v1/namespaces/default/gateways/gw", "gw", "default"),
        spec: {
          gatewayClassName: "example-gw-class",
        },
        status: {
          addresses: [
            { type: "IPAddress", value: "10.0.0.1" },
            { type: "Hostname", value: "example.com" },
          ],
        },
      });

      expect(gateway.getAddresses()).toEqual(["10.0.0.1", "example.com"]);
    });

    it("isReady() returns true when Ready condition is True", () => {
      const gateway = new Gateway({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "Gateway",
        metadata: baseMetadata("/apis/gateway.networking.k8s.io/v1/namespaces/default/gateways/gw", "gw", "default"),
        spec: {
          gatewayClassName: "example-gw-class",
        },
        status: {
          conditions: [{ type: "Ready", status: "True" }],
        },
      });

      expect(gateway.isReady()).toBe(true);
    });
  });

  describe("HTTPRoute", () => {
    const httpRoute = new HTTPRoute({
      apiVersion: "gateway.networking.k8s.io/v1",
      kind: "HTTPRoute",
      metadata: baseMetadata(
        "/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes/test-http-route",
        "test-http-route",
        "default",
      ),
      spec: {
        commonParentRefs: [
          {
            name: "common-gateway",
            kind: "Gateway",
            namespace: "default",
          },
        ],
        parentRefs: [
          {
            name: "rule-gateway",
            kind: "Gateway",
            namespace: "default",
          },
        ],
        rules: [
          {
            backendRefs: [
              {
                name: "backend-1",
                kind: "Service",
                port: 8080,
              },
              {
                name: "backend-2",
                kind: "Service",
                port: 8081,
              },
            ],
            filters: [
              {
                type: "RequestRedirect",
              },
            ],
          },
          {
            backendRefs: [
              {
                name: "backend-3",
                kind: "Service",
              },
            ],
          },
        ],
      },
    });

    it("getParentRefs() merges commonParentRefs and parentRefs", () => {
      const refs = httpRoute.getParentRefs();
      expect(refs).toHaveLength(2);
      expect(refs[0].name).toBe("common-gateway");
      expect(refs[1].name).toBe("rule-gateway");
    });

    it("getBackendRefs() aggregates all rules", () => {
      const refs = httpRoute.getBackendRefs();
      expect(refs).toHaveLength(3);
      expect(refs[0].name).toBe("backend-1");
      expect(refs[2].name).toBe("backend-3");
    });

    it("getFilters() aggregates all filters", () => {
      const filters = httpRoute.getFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe("RequestRedirect");
    });

    it("isAccepted() returns false when no parents", () => {
      const noStatus = new HTTPRoute({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "HTTPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes/test",
          "test",
          "default",
        ),
        spec: { rules: [] },
      });
      expect(noStatus.isAccepted()).toBe(false);
    });

    it("isAccepted() returns false when not accepted", () => {
      const notAccepted = new HTTPRoute({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "HTTPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes/test",
          "test",
          "default",
        ),
        spec: { rules: [] },
        status: {
          parents: [
            {
              parentRef: { name: "gateway", kind: "Gateway" },
              conditions: [{ type: "Accepted", status: "False", reason: "Unsupported" }],
            },
          ],
        },
      });
      expect(notAccepted.isAccepted()).toBe(false);
    });

    it("isAccepted() returns true when accepted", () => {
      const accepted = new HTTPRoute({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "HTTPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes/test",
          "test",
          "default",
        ),
        spec: { rules: [] },
        status: {
          parents: [
            {
              parentRef: { name: "gateway", kind: "Gateway" },
              conditions: [{ type: "Accepted", status: "True" }],
            },
          ],
        },
      });
      expect(accepted.isAccepted()).toBe(true);
    });
  });

  describe("GRPCRoute", () => {
    it("getParentRefs() merges commonParentRefs and parentRefs", () => {
      const grpcRoute = new GRPCRoute({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "GRPCRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/grpcroutes/test-grpc-route",
          "test-grpc-route",
          "default",
        ),
        spec: {
          commonParentRefs: [
            {
              name: "common-gateway",
              kind: "Gateway",
            },
          ],
          parentRefs: [
            {
              name: "rule-gateway",
              kind: "Gateway",
            },
          ],
          rules: [],
        },
      });

      const refs = grpcRoute.getParentRefs();
      expect(refs).toHaveLength(2);
      expect(refs[0].name).toBe("common-gateway");
      expect(refs[1].name).toBe("rule-gateway");
    });

    it("getBackendRefs() aggregates all rules", () => {
      const grpcRoute = new GRPCRoute({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "GRPCRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/grpcroutes/test-grpc-route",
          "test-grpc-route",
          "default",
        ),
        spec: {
          rules: [
            {
              backendRefs: [{ name: "backend-1", kind: "Service" }],
            },
            {
              backendRefs: [{ name: "backend-2", kind: "Service" }],
            },
          ],
        },
      });

      const refs = grpcRoute.getBackendRefs();
      expect(refs).toHaveLength(2);
      expect(refs[0].name).toBe("backend-1");
      expect(refs[1].name).toBe("backend-2");
    });

    it("getFilters() aggregates all filters", () => {
      const grpcRoute = new GRPCRoute({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "GRPCRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/grpcroutes/test-grpc-route",
          "test-grpc-route",
          "default",
        ),
        spec: {
          rules: [
            {
              filters: [{ type: "RequestMirror" }],
            },
          ],
        },
      });

      const filters = grpcRoute.getFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe("RequestMirror");
    });

    it("isAccepted() returns true when accepted", () => {
      const accepted = new GRPCRoute({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "GRPCRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/grpcroutes/test",
          "test",
          "default",
        ),
        spec: { rules: [] },
        status: {
          parents: [
            {
              parentRef: { name: "gateway", kind: "Gateway" },
              conditions: [{ type: "Accepted", status: "True" }],
            },
          ],
        },
      });
      expect(accepted.isAccepted()).toBe(true);
    });
  });

  describe("TCPRoute", () => {
    it("getParentRefs() returns parent references", () => {
      const tcpRoute = new TCPRoute({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "TCPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/tcproutes/test-tcp-route",
          "test-tcp-route",
          "default",
        ),
        spec: {
          parentRefs: [
            {
              name: "gateway",
              kind: "Gateway",
            },
          ],
          rules: [
            {
              backendRefs: [
                {
                  name: "backend",
                  kind: "Service",
                },
              ],
            },
          ],
        },
      });

      const refs = tcpRoute.getParentRefs();
      expect(refs).toHaveLength(1);
      expect(refs[0].name).toBe("gateway");
    });

    it("getBackendRefs() aggregates all rules", () => {
      const tcpRoute = new TCPRoute({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "TCPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/tcproutes/test",
          "test",
          "default",
        ),
        spec: {
          parentRefs: [{ name: "gateway", kind: "Gateway" }],
          rules: [
            {
              backendRefs: [{ name: "backend-1", kind: "Service" }],
            },
            {
              backendRefs: [{ name: "backend-2", kind: "Service" }],
            },
          ],
        },
      });

      const refs = tcpRoute.getBackendRefs();
      expect(refs).toHaveLength(2);
      expect(refs[0].name).toBe("backend-1");
      expect(refs[1].name).toBe("backend-2");
    });

    it("isAccepted() returns true when accepted", () => {
      const accepted = new TCPRoute({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "TCPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/tcproutes/test",
          "test",
          "default",
        ),
        spec: {
          parentRefs: [{ name: "gateway", kind: "Gateway" }],
          rules: [],
        },
        status: {
          parents: [
            {
              parentRef: { name: "gateway", kind: "Gateway" },
              conditions: [{ type: "Accepted", status: "True" }],
            },
          ],
        },
      });
      expect(accepted.isAccepted()).toBe(true);
    });
  });

  describe("TLSRoute", () => {
    it("getBackendRefs() aggregates all rules", () => {
      const tlsRoute = new TLSRoute({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "TLSRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/tlsroutes/test",
          "test",
          "default",
        ),
        spec: {
          parentRefs: [{ name: "gateway", kind: "Gateway" }],
          rules: [
            {
              backendRefs: [{ name: "backend-1", kind: "Service" }],
            },
            {
              backendRefs: [{ name: "backend-2", kind: "Service" }],
            },
          ],
        },
      });

      const refs = tlsRoute.getBackendRefs();
      expect(refs).toHaveLength(2);
      expect(refs[0].name).toBe("backend-1");
      expect(refs[1].name).toBe("backend-2");
    });

    it("isAccepted() returns true when accepted", () => {
      const accepted = new TLSRoute({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "TLSRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/tlsroutes/test",
          "test",
          "default",
        ),
        spec: {
          parentRefs: [{ name: "gateway", kind: "Gateway" }],
          rules: [],
        },
        status: {
          parents: [
            {
              parentRef: { name: "gateway", kind: "Gateway" },
              conditions: [{ type: "Accepted", status: "True" }],
            },
          ],
        },
      });
      expect(accepted.isAccepted()).toBe(true);
    });
  });

  describe("UDPRoute", () => {
    it("getBackendRefs() aggregates all rules", () => {
      const udpRoute = new UDPRoute({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "UDPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/udproutes/test",
          "test",
          "default",
        ),
        spec: {
          parentRefs: [{ name: "gateway", kind: "Gateway" }],
          rules: [
            {
              backendRefs: [{ name: "backend-1", kind: "Service" }],
            },
            {
              backendRefs: [{ name: "backend-2", kind: "Service" }],
            },
          ],
        },
      });

      const refs = udpRoute.getBackendRefs();
      expect(refs).toHaveLength(2);
      expect(refs[0].name).toBe("backend-1");
      expect(refs[1].name).toBe("backend-2");
    });

    it("isAccepted() returns true when accepted", () => {
      const accepted = new UDPRoute({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "UDPRoute",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/udproutes/test",
          "test",
          "default",
        ),
        spec: {
          parentRefs: [{ name: "gateway", kind: "Gateway" }],
          rules: [],
        },
        status: {
          parents: [
            {
              parentRef: { name: "gateway", kind: "Gateway" },
              conditions: [{ type: "Accepted", status: "True" }],
            },
          ],
        },
      });
      expect(accepted.isAccepted()).toBe(true);
    });
  });

  describe("BackendTLSPolicy", () => {
    it("getTargetRefs() returns target references", () => {
      const policy = new BackendTLSPolicy({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "BackendTLSPolicy",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/backendtlspolicies/test-policy",
          "test-policy",
          "default",
        ),
        spec: {
          targetRefs: [
            {
              group: "apps",
              kind: "Deployment",
              name: "backend",
            },
            {
              group: "",
              kind: "Service",
              name: "svc",
            },
          ],
          caCertRefs: [
            {
              group: "",
              kind: "Secret",
              name: "ca-cert",
            },
          ],
        },
      });

      const refs = policy.getTargetRefs();
      expect(refs).toHaveLength(2);
      expect(refs[0].kind).toBe("Deployment");
      expect(refs[1].kind).toBe("Service");
      expect(policy.getCaCertRefs()).toHaveLength(1);
    });

    it("isAccepted() returns true when Accepted condition is True", () => {
      const accepted = new BackendTLSPolicy({
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "BackendTLSPolicy",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1/namespaces/default/backendtlspolicies/test",
          "test",
          "default",
        ),
        spec: {
          targetRefs: [{ kind: "Service", name: "svc" }],
          caCertRefs: [{ kind: "Secret", name: "ca-cert" }],
        },
        status: {
          conditions: [{ type: "Accepted", status: "True" }],
        },
      });
      expect(accepted.isAccepted()).toBe(true);
    });
  });

  describe("BackendLBPolicy", () => {
    it("getPolicyType() returns the policy type", () => {
      const policy = new BackendLBPolicy({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "BackendLBPolicy",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/backendlbpolicies/test-policy",
          "test-policy",
          "default",
        ),
        spec: {
          policyType: "RoundRobin",
          targetRef: { kind: "Service", name: "svc" },
        },
      });

      expect(policy.getPolicyType()).toBe("RoundRobin");
      expect(policy.getTargetRefs()).toHaveLength(1);
    });

    it("isAccepted() returns true when Accepted condition is True", () => {
      const accepted = new BackendLBPolicy({
        apiVersion: "gateway.networking.k8s.io/v1alpha2",
        kind: "BackendLBPolicy",
        metadata: baseMetadata(
          "/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/backendlbpolicies/test",
          "test",
          "default",
        ),
        spec: {
          policyType: "RoundRobin",
          targetRef: { kind: "Service", name: "svc" },
        },
        status: {
          conditions: [{ type: "Accepted", status: "True" }],
        },
      });
      expect(accepted.isAccepted()).toBe(true);
    });
  });
});
