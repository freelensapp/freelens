/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface GatewayListener {
  name: string;
  hostname?: string;
  port: number;
  protocol: string;
  allowedRoutes?: {
    namespaces?: {
      from: "Selector" | "All";
      selector?: {
        matchLabels?: Record<string, string>;
      };
    };
  };
  tls?: {
    mode?: string;
    certificateRefs?: Array<{
      group?: string;
      kind: string;
      name: string;
      namespace?: string;
    }>;
  };
}

export interface GatewaySpec {
  gatewayClassName: string;
  listeners?: GatewayListener[];
  addresses?: Array<
    | string
    | {
        type: string;
        value: string;
      }
  >;
}

export interface GatewayStatus {
  conditions?: Array<{
    type: string;
    status: "True" | "False" | "Unknown";
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
  listeners?: Array<{
    name: string;
    attachedRoutes: number;
    conditions?: Array<{
      type: string;
      status: "True" | "False" | "Unknown";
      reason?: string;
      message?: string;
    }>;
  }>;
  addresses?: Array<{
    type: string;
    value: string;
  }>;
}

export class Gateway extends KubeObject<NamespaceScopedMetadata, GatewayStatus, GatewaySpec> {
  static readonly kind = "Gateway";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/gateways";

  getClassName(): string {
    return this.spec.gatewayClassName;
  }

  getAddresses(): string[] {
    if (this.status?.addresses) {
      return this.status.addresses.map((a) => (typeof a === "string" ? a : a.value));
    }
    return [];
  }

  getListeners(): GatewayListener[] {
    return this.spec.listeners ?? [];
  }

  isReady(): boolean {
    return this.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True") ?? false;
  }
}
