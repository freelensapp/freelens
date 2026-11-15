/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { describe, expect, it } from "vitest";
import { findOptimalDefaultContainer, findOptimalDefaultContainerOfPod } from "../default-container-helper";

import type { PodSpec, PodStatus } from "@freelensapp/kube-object";

const createPod = (spec: Partial<PodSpec>, annotations?: Record<string, string>) =>
  new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name: "some-pod",
      namespace: "default",
      resourceVersion: "1",
      selfLink: "/api/v1/namespaces/default/pods/some-pod",
      uid: "some-uid",
      annotations,
    },
    spec: spec as PodSpec,
    status: {} as PodStatus,
  });

describe("findOptimalDefaultContainer", () => {
  const containers = [{ name: "first" }, { name: "second" }, { name: "third" }];

  it("given the annotation names a container in the list, returns that container", () => {
    expect(findOptimalDefaultContainer(containers, { "kubectl.kubernetes.io/default-container": "second" })).toBe(
      containers[1],
    );
  });

  it("given the annotation names a container that is not in the list, falls back to the first container", () => {
    expect(findOptimalDefaultContainer(containers, { "kubectl.kubernetes.io/default-container": "missing" })).toBe(
      containers[0],
    );
  });

  it("given no annotation, returns the first container", () => {
    expect(findOptimalDefaultContainer(containers, { "some-other-annotation": "second" })).toBe(containers[0]);
  });

  it("given no annotations at all, returns the first container", () => {
    expect(findOptimalDefaultContainer(containers, undefined)).toBe(containers[0]);
  });

  it("given no containers, returns undefined", () => {
    expect(findOptimalDefaultContainer([], { "kubectl.kubernetes.io/default-container": "second" })).toBeUndefined();
  });
});

describe("findOptimalDefaultContainerOfPod", () => {
  it("given the annotation names a container of the pod, returns that container", () => {
    const pod = createPod(
      {
        containers: [{ name: "app" }, { name: "sidecar" }],
        initContainers: [{ name: "init" }],
      },
      { "kubectl.kubernetes.io/default-container": "sidecar" },
    );

    expect(findOptimalDefaultContainerOfPod(pod)?.name).toBe("sidecar");
  });

  it("given the annotation names a container the pod does not have, returns the first of spec.containers", () => {
    const pod = createPod(
      {
        containers: [{ name: "app" }, { name: "sidecar" }],
        initContainers: [{ name: "init" }],
      },
      { "kubectl.kubernetes.io/default-container": "missing" },
    );

    expect(findOptimalDefaultContainerOfPod(pod)?.name).toBe("app");
  });

  it("given no annotation, returns the first of spec.containers", () => {
    const pod = createPod({
      containers: [{ name: "app" }, { name: "sidecar" }],
      initContainers: [{ name: "init" }],
    });

    expect(findOptimalDefaultContainerOfPod(pod)?.name).toBe("app");
  });

  it("given a pod without containers, returns undefined", () => {
    const pod = createPod({}, { "kubectl.kubernetes.io/default-container": "app" });

    expect(findOptimalDefaultContainerOfPod(pod)).toBeUndefined();
  });
});
