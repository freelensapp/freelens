/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LeaseApi } from "@freelensapp/kube-api";
import type { Lease } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class LeaseStore extends KubeObjectStore<Lease, LeaseApi> {}
