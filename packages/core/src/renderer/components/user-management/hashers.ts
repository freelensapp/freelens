/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Subject } from "@freelensapp/kube-object";
import { MD5 } from "crypto-js";

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
