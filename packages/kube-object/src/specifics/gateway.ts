/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface GatewayTLSConfig {
  mode?: "Terminate" | "Passthrough";
  certificateRefs?: Array<{
    group?: string;
    kind?: string;
    name: string;
    namespace?: string;
  }>;
}

export interface GatewayListener {
  name: string;
  hostname?: string;
  port: number;
  protocol: string;
  tls?: GatewayTLSConfig;
  allowedRoutes?: {
    namespaces?: { from?: string; selector?: object };
    kinds?: Array<{ group?: string; kind: string }>;
  };
}

export interface GatewayAddress {
  type?: string;
  value: string;
}

export interface GatewaySpec {
  gatewayClassName: string;
  listeners: GatewayListener[];
  addresses?: GatewayAddress[];
}

export interface GatewayCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
}

export interface GatewayListenerStatus {
  name: string;
  attachedRoutes: number;
  conditions: GatewayCondition[];
  supportedKinds?: Array<{ group?: string; kind: string }>;
}

export interface GatewayStatus {
  conditions?: GatewayCondition[];
  listeners?: GatewayListenerStatus[];
  addresses?: GatewayAddress[];
}

export class Gateway extends KubeObject<NamespaceScopedMetadata, GatewayStatus, GatewaySpec> {
  static readonly kind = "Gateway";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/gateways";

  getGatewayClassName(): string {
    return this.spec.gatewayClassName;
  }

  getListeners(): GatewayListener[] {
    return this.spec.listeners ?? [];
  }

  getAddresses(): string[] {
    return (this.status?.addresses ?? []).map((a) => a.value);
  }

  getConditions(): GatewayCondition[] {
    return this.status?.conditions ?? [];
  }
}
