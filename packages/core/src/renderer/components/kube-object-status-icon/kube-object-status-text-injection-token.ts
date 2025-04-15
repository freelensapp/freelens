/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";
import { getInjectionToken } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type { KubeObjectStatus } from "../../../common/k8s-api/kube-object-status";

export interface KubeObjectStatusText {
  kind: string;
  apiVersions: string[];
  resolve: (object: KubeObject) => KubeObjectStatus | null;
  enabled: IComputedValue<boolean>;
}

export const kubeObjectStatusTextInjectionToken = getInjectionToken<KubeObjectStatusText>({
  id: "kube-object-status-text-injection-token",
});
