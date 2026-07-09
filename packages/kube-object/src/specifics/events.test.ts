/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeEvent } from "./events";

import type { KubeEventData } from "./events";

function createEvent(overrides: Partial<KubeEventData> = {}): KubeEvent {
  return new KubeEvent({
    apiVersion: "v1",
    kind: "Event",
    metadata: {
      name: "some-event",
      namespace: "default",
      resourceVersion: "1",
      uid: "some-uid",
      selfLink: "/api/v1/namespaces/default/events/some-event",
    },
    involvedObject: {
      apiVersion: "v1",
      kind: "Pod",
      name: "some-pod",
      namespace: "default",
      resourceVersion: "1",
      uid: "some-pod-uid",
      fieldPath: "",
    },
    ...overrides,
  });
}

describe("KubeEvent tests", () => {
  describe("getSource()", () => {
    it("uses the legacy source.component and source.host when present", () => {
      const event = createEvent({ source: { component: "kubelet", host: "node-1" } });

      expect(event.getSource()).toBe("kubelet node-1");
    });

    it("falls back to reportingComponent / reportingInstance for events.k8s.io/v1 events", () => {
      const event = createEvent({
        reportingComponent: "my-operator",
        reportingInstance: "my-operator-abc123",
      });

      expect(event.getSource()).toBe("my-operator my-operator-abc123");
    });

    it("falls back to reportingComponent alone when reportingInstance is missing", () => {
      const event = createEvent({ reportingComponent: "my-operator" });

      expect(event.getSource()).toBe("my-operator");
    });

    it("prefers the legacy source over reportingComponent when both are present", () => {
      const event = createEvent({
        source: { component: "kubelet", host: "node-1" },
        reportingComponent: "my-operator",
      });

      expect(event.getSource()).toBe("kubelet node-1");
    });

    it("returns <unknown> when no source information is available", () => {
      const event = createEvent();

      expect(event.getSource()).toBe("<unknown>");
    });
  });

  describe("getCount()", () => {
    it("uses the legacy count when present", () => {
      const event = createEvent({ count: 3 });

      expect(event.getCount()).toBe(3);
    });

    it("falls back to series.count for events.k8s.io/v1 events", () => {
      const event = createEvent({ series: { count: 7 } });

      expect(event.getCount()).toBe(7);
    });

    it("prefers the legacy count over series.count when both are present", () => {
      const event = createEvent({ count: 3, series: { count: 7 } });

      expect(event.getCount()).toBe(3);
    });

    it("returns 0 when no count information is available", () => {
      const event = createEvent();

      expect(event.getCount()).toBe(0);
    });
  });
});
