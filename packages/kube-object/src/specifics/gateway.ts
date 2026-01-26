/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type GatewayProtocol = "HTTP" | "HTTPS" | "TCP" | "TLS" | "UDP";

export type TLSMode = "Terminate" | "Passthrough";

export interface GatewayListener {
  name: string;
  hostname?: string;
  port: number;
  protocol: GatewayProtocol;
  allowedRoutes?: {
    namespaces?: {
      from: "Selector" | "All";
      selector?: {
        matchLabels?: Record<string, string>;
      };
    };
  };
  tls?: {
    mode?: TLSMode;
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

  /**
   * Get the actual addresses assigned to this Gateway from status.
   * Handles both string addresses and typed address objects.
   */
  getAddresses(): string[] {
    if (this.status?.addresses) {
      return this.status.addresses.map((a) => (typeof a === "string" ? a : a.value));
    }
    return [];
  }

  getListeners(): GatewayListener[] {
    return this.spec.listeners ?? [];
  }

  /**
   * Check if this Gateway is ready to serve traffic.
   * Returns true when the "Ready" condition in status is True.
   */
  isReady(): boolean {
    return this.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True") ?? false;
  }
}
