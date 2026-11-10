/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Subject } from "@freelensapp/kube-object";

/**
 * Produces a stable, in-memory key used to deduplicate {@link Subject}s inside
 * `HashSet` / `ObservableHashSet`. The value is never persisted or displayed,
 * so a plain deterministic serialization is sufficient (no digest required).
 */
export function hashSubject(subject: Subject): string {
  return JSON.stringify([
    ["kind", subject.kind],
    ["name", subject.name],
    ["namespace", subject.namespace],
    ["apiGroup", subject.apiGroup],
  ]);
}
