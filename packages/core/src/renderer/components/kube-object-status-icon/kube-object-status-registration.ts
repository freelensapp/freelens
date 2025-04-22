/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";
import type { IComputedValue } from "mobx";
import type { KubeObjectStatus } from "../../../common/k8s-api/kube-object-status";

export interface KubeObjectStatusRegistration {
  kind: string;
  apiVersions: string[];
  resolve: (object: KubeObject) => KubeObjectStatus;
  visible?: IComputedValue<boolean>;
}
