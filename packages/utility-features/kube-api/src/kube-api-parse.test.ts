/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { IKubeApiParsed } from "./kube-api-parse";
import { parseKubeApi } from "./kube-api-parse";

/**
 * [<input-url>, <expected-result>]
 */
type KubeApiParseTestData = [string, IKubeApiParsed];

const tests: KubeApiParseTestData[] = [
  [
    "http://some-irrelevant-domain/api/v1/secrets?some-irrelevant-parameter=some-irrelevant-value",
    {
      apiBase: "/api/v1/secrets",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "v1",
      apiVersionWithGroup: "v1",
      resource: "secrets",
      name: undefined,
      namespace: undefined,
    },
  ],
  [
    "/api/v1/secrets",
    {
      apiBase: "/api/v1/secrets",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "v1",
      apiVersionWithGroup: "v1",
      resource: "secrets",
      name: undefined,
      namespace: undefined,
    },
  ],
  [
    "/api/v1/namespaces",
    {
      apiBase: "/api/v1/namespaces",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "v1",
      apiVersionWithGroup: "v1",
      resource: "namespaces",
      name: undefined,
      namespace: undefined,
    },
  ],
  [
    "/api/v1/nodes/minikube",
    {
      apiBase: "/api/v1/nodes",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "v1",
      apiVersionWithGroup: "v1",
      resource: "nodes",
      name: "minikube",
      namespace: undefined,
    },
  ],
  [
    "/api/foo-bar/nodes/minikube",
    {
      apiBase: "/api/foo-bar/nodes",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "foo-bar",
      apiVersionWithGroup: "foo-bar",
      resource: "nodes",
      name: "minikube",
      namespace: undefined,
    },
  ],
  [
    "/api/v1/namespaces/kube-public",
    {
      apiBase: "/api/v1/namespaces",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "v1",
      apiVersionWithGroup: "v1",
      resource: "namespaces",
      name: "kube-public",
      namespace: undefined,
    },
  ],
  [
    "/apis/stable.example.com/foo1/crontabs",
    {
      apiBase: "/apis/stable.example.com/foo1/crontabs",
      apiPrefix: "/apis",
      apiGroup: "stable.example.com",
      apiVersion: "foo1",
      apiVersionWithGroup: "stable.example.com/foo1",
      resource: "crontabs",
      name: undefined,
      namespace: undefined,
    },
  ],
  [
    "/apis/cluster.k8s.io/v1alpha1/clusters",
    {
      apiBase: "/apis/cluster.k8s.io/v1alpha1/clusters",
      apiPrefix: "/apis",
      apiGroup: "cluster.k8s.io",
      apiVersion: "v1alpha1",
      apiVersionWithGroup: "cluster.k8s.io/v1alpha1",
      resource: "clusters",
      name: undefined,
      namespace: undefined,
    },
  ],
  [
    "/api/v1/namespaces/kube-system/pods/coredns-6955765f44-v8p27",
    {
      apiBase: "/api/v1/pods",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "v1",
      apiVersionWithGroup: "v1",
      namespace: "kube-system",
      resource: "pods",
      name: "coredns-6955765f44-v8p27",
    },
  ],
  [
    "/apis/apps/v1/namespaces/default/deployments/some-deployment",
    {
      apiBase: "/apis/apps/v1/deployments",
      apiGroup: "apps",
      apiPrefix: "/apis",
      apiVersion: "v1",
      apiVersionWithGroup: "apps/v1",
      name: "some-deployment",
      namespace: "default",
      resource: "deployments",
    },
  ],
  [
    "/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions/prometheuses.monitoring.coreos.com",
    {
      apiBase: "/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions",
      apiPrefix: "/apis",
      apiGroup: "apiextensions.k8s.io",
      apiVersion: "v1beta1",
      apiVersionWithGroup: "apiextensions.k8s.io/v1beta1",
      namespace: undefined,
      resource: "customresourcedefinitions",
      name: "prometheuses.monitoring.coreos.com",
    },
  ],
  [
    "/api/v1/namespaces/kube-system/pods",
    {
      apiBase: "/api/v1/pods",
      apiPrefix: "/api",
      apiGroup: "",
      apiVersion: "v1",
      apiVersionWithGroup: "v1",
      namespace: "kube-system",
      resource: "pods",
      name: undefined,
    },
  ],
  [
    "/apis/cluster.k8s.io/v1/namespaces/kube-system/pods",
    {
      apiBase: "/apis/cluster.k8s.io/v1/pods",
      apiPrefix: "/apis",
      apiGroup: "cluster.k8s.io",
      apiVersion: "v1",
      apiVersionWithGroup: "cluster.k8s.io/v1",
      namespace: "kube-system",
      resource: "pods",
      name: undefined,
    },
  ],
];

const invalidTests = [
  undefined,
  "",
  "some-invalid-path",
  "//apiextensions.k8s.io/v1beta1/customresourcedefinitions/prometheuses.monitoring.coreos.com",
  "/apis//v1beta1/customresourcedefinitions/prometheuses.monitoring.coreos.com",
  "/apis/apiextensions.k8s.io//customresourcedefinitions/prometheuses.monitoring.coreos.com",
  "/apis/apiextensions.k8s.io/v1beta1//prometheuses.monitoring.coreos.com",
  "/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions/",
  "//v1beta1/customresourcedefinitions/prometheuses.monitoring.coreos.com",
  "/api//v1beta1/customresourcedefinitions/prometheuses.monitoring.coreos.com",
  "/api//customresourcedefinitions/prometheuses.monitoring.coreos.com",
  "/api/v1beta1//prometheuses.monitoring.coreos.com",
  "/api/v1beta1/customresourcedefinitions/",
];

describe("parseApi unit tests", () => {
  it.each(tests)(`given path %j, parses as expected`, (url, expected) => {
    expect(parseKubeApi(url)).toStrictEqual(expected);
  });
  it.each(invalidTests)(`given path %j, parses as undefined`, (url) => {
    expect(parseKubeApi(url as never)).toBe(undefined);
  });
});
