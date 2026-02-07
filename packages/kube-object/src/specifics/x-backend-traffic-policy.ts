/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { BaseKubeObjectCondition, NamespaceScopedMetadata } from "../api-types";

export interface PolicyTargetReference {
  group: string;
  kind: string;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface SessionPersistenceCookieConfig {
  lifetimeType?: "Session" | "Permanent";
}

export interface SessionPersistence {
  type: "Cookie" | "Header";
  cookieConfig?: SessionPersistenceCookieConfig;
  idleTimeout?: string;
  absoluteTimeout?: string;
  sessionName?: string;
}

export interface RetryBudget {
  interval: string;
  percent: number;
  minRetries?: number;
}

export interface MinRetryRate {
  count: number;
  interval: string;
}

export interface RetryConstraint {
  budget?: RetryBudget;
  minRetryRate?: MinRetryRate;
}

export interface PolicyAncestor {
  group?: string;
  kind: string;
  name: string;
  namespace?: string;
  controllerName?: string;
  conditions?: BaseKubeObjectCondition[];
}

export interface XBackendTrafficPolicySpec {
  targetRefs: PolicyTargetReference[];
  sessionPersistence?: SessionPersistence;
  retryConstraint?: RetryConstraint;
}

export interface XBackendTrafficPolicyStatus {
  ancestors?: PolicyAncestor[];
}

/**
 * XBackendTrafficPolicy is a namespaced policy resource that provides
 * traffic control features like session persistence and retry constraints
 * (experimental channel, successor to BackendLBPolicy).
 * @see https://gateway-api.sigs.k8s.io/geps/gep-1619/
 */
export class XBackendTrafficPolicy extends KubeObject<
  NamespaceScopedMetadata,
  XBackendTrafficPolicyStatus,
  XBackendTrafficPolicySpec
> {
  static readonly kind = "XBackendTrafficPolicy";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.x-k8s.io/v1alpha1/xbackendtrafficpolicies";

  /**
   * Get the target references for this XBackendTrafficPolicy
   */
  getTargetRefs(): PolicyTargetReference[] {
    return this.spec.targetRefs ?? [];
  }

  /**
   * Get the session persistence type for this XBackendTrafficPolicy
   */
  getSessionPersistenceType(): string | undefined {
    return this.spec.sessionPersistence?.type;
  }

  /**
   * Check if retry constraints are defined
   */
  hasRetryConstraints(): boolean {
    return this.spec.retryConstraint !== undefined;
  }

  /**
   * Get the ancestor statuses for this XBackendTrafficPolicy
   */
  getAncestors(): PolicyAncestor[] {
    return this.status?.ancestors ?? [];
  }
}
