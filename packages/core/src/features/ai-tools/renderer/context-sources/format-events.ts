/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface EventLike {
  type?: string;
  reason?: string;
  message?: string;
  count?: number;
  lastTimestamp?: string;
  eventTime?: string;
  firstTimestamp?: string;
  involvedObject?: { kind?: string; name?: string; namespace?: string };
  metadata?: { creationTimestamp?: string };
}

const timeOf = (event: EventLike) =>
  event.lastTimestamp ?? event.eventTime ?? event.firstTimestamp ?? event.metadata?.creationTimestamp ?? "";

/**
 * One line per event, newest first: `time type reason (xN) Kind ns/name: message`.
 */
export const formatEvents = (events: EventLike[], limit = 60) =>
  [...events]
    .sort((left, right) => timeOf(right).localeCompare(timeOf(left)))
    .slice(0, limit)
    .map((event) => {
      const object = event.involvedObject;
      const subject = object
        ? `${object.kind ?? ""} ${object.namespace ? `${object.namespace}/` : ""}${object.name ?? ""}`.trim()
        : "";
      const count = event.count && event.count > 1 ? ` (x${event.count})` : "";

      return `${timeOf(event) || "-"} ${event.type ?? "Normal"} ${event.reason ?? ""}${count} ${subject}: ${(event.message ?? "").replace(/\s+/g, " ").trim()}`;
    })
    .join("\n");
