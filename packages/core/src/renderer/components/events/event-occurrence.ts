/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeEvent } from "@freelensapp/kube-object";

/*
 * When an event happened, and how many times, as `kubectl get events` shows it. The events.k8s.io/v1 recorder leaves
 * the legacy firstTimestamp, lastTimestamp and count empty: it sets eventTime when the event first happens, and series
 * (count and lastObservedTime) once it repeats. Read through the core/v1 API, the legacy fields of such an event stay
 * empty. These are core functions on purpose: KubeEvent belongs to the extension API, and its getCount() keeps its
 * contract.
 */

/** When the event was first seen: firstTimestamp, or eventTime for an events.k8s.io/v1 event. */
export function getEventFirstSeen(event: KubeEvent): string | undefined {
  return event.firstTimestamp || event.eventTime || undefined;
}

/** When the event was last seen: the lastObservedTime of a repeated event, then lastTimestamp, then the first time. */
export function getEventLastSeen(event: KubeEvent): string | undefined {
  return event.series?.lastObservedTime || event.lastTimestamp || getEventFirstSeen(event);
}

/** How many times the event happened. An events.k8s.io/v1 event seen once has no count, and counts as one. */
export function getEventCount(event: KubeEvent): number {
  return event.getCount() || 1;
}
