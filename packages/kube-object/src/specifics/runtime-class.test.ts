/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { RuntimeClass } from "./runtime-class";

import type { RuntimeClassData } from "./runtime-class";

const runtimeClass = (data: Partial<RuntimeClassData> = {}) =>
  new RuntimeClass({
    apiVersion: "node.k8s.io/v1",
    kind: "RuntimeClass",
    metadata: {
      name: "kata",
      resourceVersion: "1",
      uid: "kata",
      selfLink: "/apis/node.k8s.io/v1/runtimeclasses/kata",
    },
    handler: "kata",
    ...data,
  });

describe("RuntimeClass", () => {
  describe("getPodFixed()", () => {
    it("lists the resources of the fixed overhead of a pod with their quantities", () => {
      expect(runtimeClass({ overhead: { podFixed: { cpu: "250m", memory: "160Mi" } } }).getPodFixed()).toBe(
        "cpu: 250m, memory: 160Mi",
      );
    });

    it("is empty when the class has no overhead", () => {
      expect(runtimeClass().getPodFixed()).toBe("");
      expect(runtimeClass({ overhead: {} }).getPodFixed()).toBe("");
    });
  });
});
