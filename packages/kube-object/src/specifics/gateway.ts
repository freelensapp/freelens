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

/**
 * Gateway represents a logical endpoint that binds traffic to Routes.
 *
 * Gateways are namespace-scoped resources that define listeners (ports, protocols,
 * and hostnames). Routes (HTTPRoute, GRPCRoute, etc.) attach to Gateways to receive
 * traffic. A Gateway's listeners expose IP addresses that clients connect to.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1.Gateway
 */
export class Gateway extends KubeObject<NamespaceScopedMetadata, GatewayStatus, GatewaySpec> {
  static readonly kind = "Gateway";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/gateways";

  /**
   * Get the GatewayClass that defines which controller manages this Gateway.
   * The controller watches for Gateways referencing its GatewayClass.
   */
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

  /**
   * Get all listeners defined on this Gateway.
   * Listeners define the protocol, port, and hostname for incoming connections.
   */
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
