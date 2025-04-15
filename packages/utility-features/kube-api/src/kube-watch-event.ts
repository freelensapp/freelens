/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeStatusData } from "@freelensapp/kube-object";

export type IKubeWatchEvent<T> =
  | {
      readonly type: "ADDED" | "MODIFIED" | "DELETED";
      readonly object: T;
    }
  | {
      readonly type: "ERROR";
      readonly object?: KubeStatusData;
    };
