/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { resolveFieldPath, formatFieldValue } from "../resolve-field-path";

describe("resolveFieldPath", () => {
  it("resolves simple nested paths", () => {
    const obj = {
      metadata: {
        name: "test-pod",
        labels: {
          app: "nginx",
        },
      },
    };

    expect(resolveFieldPath(obj, "metadata.name")).toBe("test-pod");
    expect(resolveFieldPath(obj, "metadata.labels.app")).toBe("nginx");
  });

  it("resolves paths with bracket notation for dotted keys", () => {
    const obj = {
      metadata: {
        labels: {
          "kubernetes.io/os": "linux",
          "topology.kubernetes.io/zone": "us-west-1a",
        },
        annotations: {
          "csi.volume.kubernetes.io/nodeid": '{"ebs":"i-123"}',
        },
      },
    };

    expect(resolveFieldPath(obj, "metadata.labels['kubernetes.io/os']")).toBe("linux");
    expect(resolveFieldPath(obj, "metadata.labels['topology.kubernetes.io/zone']")).toBe("us-west-1a");
    expect(resolveFieldPath(obj, "metadata.annotations['csi.volume.kubernetes.io/nodeid']")).toBe('{"ebs":"i-123"}');
  });

  it("resolves paths with double-quote bracket notation", () => {
    const obj = {
      metadata: {
        labels: {
          "kubernetes.io/os": "linux",
        },
      },
    };

    expect(resolveFieldPath(obj, 'metadata.labels["kubernetes.io/os"]')).toBe("linux");
  });

  it("resolves array indices with dot notation", () => {
    const obj = {
      status: {
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Initialized", status: "True" },
        ],
      },
    };

    expect(resolveFieldPath(obj, "status.conditions.0.type")).toBe("Ready");
    expect(resolveFieldPath(obj, "status.conditions.1.status")).toBe("True");
  });

  it("resolves array indices with bracket notation", () => {
    const obj = {
      status: {
        conditions: [
          { type: "Ready", status: "True" },
        ],
      },
    };

    expect(resolveFieldPath(obj, "status.conditions[0].type")).toBe("Ready");
  });

  it("returns undefined for non-existent paths", () => {
    const obj = {
      metadata: {
        name: "test",
      },
    };

    expect(resolveFieldPath(obj, "metadata.nonexistent")).toBeUndefined();
    expect(resolveFieldPath(obj, "status.phase")).toBeUndefined();
  });

  it("handles complex values (objects and arrays)", () => {
    const obj = {
      spec: {
        selector: {
          matchLabels: {
            app: "nginx",
          },
        },
      },
      status: {
        conditions: [{ type: "Ready" }],
      },
    };

    const selector = resolveFieldPath(obj, "spec.selector");

    expect(selector).toEqual({ matchLabels: { app: "nginx" } });

    const conditions = resolveFieldPath(obj, "status.conditions");

    expect(conditions).toEqual([{ type: "Ready" }]);
  });
});

describe("formatFieldValue", () => {
  it("formats scalar values as strings", () => {
    expect(formatFieldValue("test")).toBe("test");
    expect(formatFieldValue(42)).toBe("42");
    expect(formatFieldValue(true)).toBe("true");
    expect(formatFieldValue(false)).toBe("false");
  });

  it("formats null and undefined as empty string", () => {
    expect(formatFieldValue(null)).toBe("");
    expect(formatFieldValue(undefined)).toBe("");
  });

  it("formats objects as JSON strings", () => {
    const obj = { app: "nginx", tier: "frontend" };
    const formatted = formatFieldValue(obj);

    expect(formatted).toBe('{"app":"nginx","tier":"frontend"}');
  });

  it("formats arrays as JSON strings", () => {
    const arr = ["Ready", "Initialized"];
    const formatted = formatFieldValue(arr);

    expect(formatted).toBe('["Ready","Initialized"]');
  });

  it("handles complex nested structures", () => {
    const complex = {
      metadata: {
        labels: { app: "test" },
      },
      items: [1, 2, 3],
    };
    const formatted = formatFieldValue(complex);

    expect(formatted).toBe('{"metadata":{"labels":{"app":"test"}},"items":[1,2,3]}');
  });
});
