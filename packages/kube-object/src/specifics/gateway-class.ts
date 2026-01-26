/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { ClusterScopedMetadata } from "../api-types";

export interface GatewayClassSpec {
  controllerName: string;
  parametersRef?: {
    group: string;
    kind: string;
    name: string;
    namespace?: string;
  };
  description?: string;
}

export interface GatewayClassStatus {
  conditions?: Array<{
    type: string;
    status: "True" | "False" | "Unknown";
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
}

export class GatewayClass extends KubeObject<ClusterScopedMetadata, GatewayClassStatus, GatewayClassSpec> {
  static readonly kind = "GatewayClass";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/gatewayclasses";

  getControllerName(): string {
    return this.spec.controllerName;
  }

  getParametersRef():
    | {
        group: string;
        kind: string;
        name: string;
        namespace?: string;
      }
    | undefined {
    return this.spec.parametersRef;
  }

  /**
   * Check if this GatewayClass is accepted by a controller.
   * Returns true when the "Accepted" condition in status is True.
   */
  isAccepted(): boolean {
    return this.status?.conditions?.some((c) => c.type === "Accepted" && c.status === "True") ?? false;
  }
}
