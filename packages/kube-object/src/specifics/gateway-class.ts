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

/**
 * GatewayClass represents a class of Gateways that share a common controller implementation.
 *
 * GatewayClass is cluster-scoped and defines the controller that will manage Gateways
 * of this class. Multiple GatewayClasses can exist in a cluster, allowing different
 * Gateway controllers to coexist.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1.GatewayClass
 */
export class GatewayClass extends KubeObject<ClusterScopedMetadata, GatewayClassStatus, GatewayClassSpec> {
  static readonly kind = "GatewayClass";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/gatewayclasses";

  /**
   * Get the controller name that manages Gateways of this class.
   * Controllers watch for GatewayClasses with their controller name to claim ownership.
   */
  getControllerName(): string {
    return this.spec.controllerName;
  }

  /**
   * Get the resource reference for controller configuration parameters.
   * Allows controllers to be configured with custom resources (e.g., ConfigMap).
   */
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
