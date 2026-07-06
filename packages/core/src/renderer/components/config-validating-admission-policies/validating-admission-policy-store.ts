/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { ValidatingAdmissionPolicyApi } from "@freelensapp/kube-api";
import type { ValidatingAdmissionPolicy } from "@freelensapp/kube-object";

export class ValidatingAdmissionPolicyStore extends KubeObjectStore<
  ValidatingAdmissionPolicy,
  ValidatingAdmissionPolicyApi
> {}
