/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";

export const getGatewayApiVersion = (object: KubeObject) =>
  object.apiVersion?.startsWith("gateway.networking.k8s.io/") ? object.apiVersion : "gateway.networking.k8s.io/v1";
