/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { evaluateCustomColumn } from "./evaluate-custom-column";

describe("evaluateCustomColumn", () => {
  const item = () => ({
    metadata: {
      name: "some-node",
      labels: {
        "node.kubernetes.io/instance-type": "m5.large",
      },
    },
    spec: {
      unschedulable: false,
      replicas: 9,
      finalizers: ["one", "two"],
    },
    status: {
      containerStatuses: [{ lastState: { terminated: { reason: "OOMKilled" } } }],
    },
  });

  describe("the rendered text", () => {
    it("evaluates a kubectl flavoured expression", () => {
      expect(evaluateCustomColumn(item(), ".metadata.labels['node.kubernetes.io/instance-type']").text).toBe(
        "m5.large",
      );
    });

    it("evaluates an indexed expression", () => {
      expect(evaluateCustomColumn(item(), ".status.containerStatuses[0].lastState.terminated.reason").text).toBe(
        "OOMKilled",
      );
    });

    it("formats a missing value as an empty string", () => {
      expect(evaluateCustomColumn(item(), ".metadata.labels['does-not-exist']").text).toBe("");
    });

    it("formats an invalid expression as an empty string", () => {
      expect(evaluateCustomColumn(item(), ".metadata[").text).toBe("");
    });
  });

  describe("the sort value", () => {
    it("keeps a number a number, so that it does not sort as text", () => {
      expect(evaluateCustomColumn(item(), ".spec.replicas").sortBy).toBe(9);
    });

    it("sorts a boolean by the text it is shown as", () => {
      expect(evaluateCustomColumn(item(), ".spec.unschedulable").sortBy).toBe("false");
    });

    it("keeps a string a string", () => {
      expect(evaluateCustomColumn(item(), ".metadata.name").sortBy).toBe("some-node");
    });

    it("sorts a missing value first", () => {
      expect(evaluateCustomColumn(item(), ".metadata.labels['does-not-exist']").sortBy).toBe("");
    });

    it("keeps a slice an array, for element by element comparison", () => {
      expect(evaluateCustomColumn(item(), ".spec.finalizers[*]").sortBy).toEqual(["one", "two"]);
    });

    it("sorts an object by the text it is shown as", () => {
      const value = evaluateCustomColumn(item(), ".status.containerStatuses[0].lastState");

      expect(value.sortBy).toBe(value.text);
    });
  });

  describe("caching", () => {
    it("evaluates an item and expression once, since a changed item is a new instance", () => {
      const target = item();

      expect(evaluateCustomColumn(target, ".metadata.name").text).toBe("some-node");

      target.metadata.name = "renamed-in-place";

      expect(evaluateCustomColumn(target, ".metadata.name").text).toBe("some-node");
    });

    it("does not reuse the value of one item for another", () => {
      const first = item();
      const second = item();

      second.metadata.name = "another-node";

      expect(evaluateCustomColumn(first, ".metadata.name").text).toBe("some-node");
      expect(evaluateCustomColumn(second, ".metadata.name").text).toBe("another-node");
    });
  });
});
