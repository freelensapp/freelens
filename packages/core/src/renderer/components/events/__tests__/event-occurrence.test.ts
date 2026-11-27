/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeEvent } from "@freelensapp/kube-object";
import { describe, expect, it } from "vitest";
import { getEventCount, getEventFirstSeen, getEventLastSeen } from "../event-occurrence";
import { sortEvents } from "../kube-event-details";

import type { KubeEventData } from "@freelensapp/kube-object";

function createEvent(name: string, overrides: Partial<KubeEventData> = {}): KubeEvent {
  return new KubeEvent({
    apiVersion: "v1",
    kind: "Event",
    metadata: {
      name,
      namespace: "default",
      resourceVersion: "1",
      uid: `${name}-uid`,
      selfLink: `/api/v1/namespaces/default/events/${name}`,
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

// As the core/v1 API returns them: the legacy recorder sets the timestamps and the count, the events.k8s.io/v1
// recorder sets eventTime, and series once the event repeats.
const legacy = () =>
  createEvent("legacy", {
    count: 3,
    firstTimestamp: "2026-11-24T10:00:00Z",
    lastTimestamp: "2026-11-24T10:05:00Z",
    source: { component: "kubelet", host: "node-1" },
  });
const newOnce = () =>
  createEvent("new-once", {
    eventTime: "2026-11-24T10:10:00.123456Z",
    reportingComponent: "keda-operator",
  });
const newRepeated = () =>
  createEvent("new-repeated", {
    eventTime: "2026-11-24T10:01:00.000000Z",
    series: { count: 4, lastObservedTime: "2026-11-24T10:20:00.000000Z" },
    reportingComponent: "keda-operator",
  });

describe("when an event happened, and how many times", () => {
  it("reads the timestamps and the count of a legacy event", () => {
    expect(getEventFirstSeen(legacy())).toBe("2026-11-24T10:00:00Z");
    expect(getEventLastSeen(legacy())).toBe("2026-11-24T10:05:00Z");
    expect(getEventCount(legacy())).toBe(3);
  });

  it("takes eventTime for an events.k8s.io/v1 event seen once, and counts it once", () => {
    expect(getEventFirstSeen(newOnce())).toBe("2026-11-24T10:10:00.123456Z");
    expect(getEventLastSeen(newOnce())).toBe("2026-11-24T10:10:00.123456Z");
    expect(getEventCount(newOnce())).toBe(1);
  });

  it("takes the series of a repeated events.k8s.io/v1 event", () => {
    expect(getEventFirstSeen(newRepeated())).toBe("2026-11-24T10:01:00.000000Z");
    expect(getEventLastSeen(newRepeated())).toBe("2026-11-24T10:20:00.000000Z");
    expect(getEventCount(newRepeated())).toBe(4);
  });

  it("prefers the last observed time of a series over lastTimestamp, as kubectl does", () => {
    const event = createEvent("both", {
      lastTimestamp: "2026-11-24T10:05:00Z",
      series: { count: 2, lastObservedTime: "2026-11-24T10:30:00.000000Z" },
    });

    expect(getEventLastSeen(event)).toBe("2026-11-24T10:30:00.000000Z");
  });

  it("knows no time for an event without any", () => {
    expect(getEventFirstSeen(createEvent("none"))).toBeUndefined();
    expect(getEventLastSeen(createEvent("none"))).toBeUndefined();
  });
});

describe("the events of an object, newest first", () => {
  it("orders legacy and events.k8s.io/v1 events by when they were last seen", () => {
    const names = sortEvents([legacy(), newRepeated(), newOnce()])?.map((event) => event.getName());

    expect(names).toEqual(["new-repeated", "new-once", "legacy"]);
  });
});
