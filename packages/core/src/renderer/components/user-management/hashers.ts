/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { MD5 } from "crypto-js";

import type { Subject } from "@freelensapp/kube-object";

export function hashSubject(subject: Subject): string {
  return MD5(
    JSON.stringify([
      ["kind", subject.kind],
      ["name", subject.name],
      ["namespace", subject.namespace],
      ["apiGroup", subject.apiGroup],
    ]),
  ).toString();
}
