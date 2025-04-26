/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";
import type { AsyncResult, Result } from "@freelensapp/utilities";
import { getInjectionToken } from "@ogre-tools/injectable";
import type { ClusterId } from "../cluster-types";

export interface KubectlApplyAllArgs {
  clusterId: ClusterId;
  resources: string[];
  extraArgs: string[];
}

export const kubectlApplyAllChannel = getRequestChannel<KubectlApplyAllArgs, Result<string, string>>(
  "kubectl-apply-all",
);

export type KubectlApplyAll = (req: KubectlApplyAllArgs) => AsyncResult<string, string>;

export const kubectlApplyAllInjectionToken = getInjectionToken<KubectlApplyAll>({
  id: "kubectl-apply-all",
});

export interface KubectlDeleteAllArgs {
  clusterId: ClusterId;
  resources: string[];
  extraArgs: string[];
}

export const kubectlDeleteAllChannel = getRequestChannel<KubectlDeleteAllArgs, Result<string, string>>(
  "kubectl-delete-all",
);

export type KubectlDeleteAll = (req: KubectlDeleteAllArgs) => AsyncResult<string, string>;

export const kubectlDeleteAllInjectionToken = getInjectionToken<KubectlDeleteAll>({
  id: "kubectl-delete-all",
});
