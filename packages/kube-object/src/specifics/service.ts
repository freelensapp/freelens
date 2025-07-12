/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type ServiceType = "ClusterIP" | "NodePort" | "LoadBalancer" | "ExternalName";

export type Protocol = "TCP" | "UDP" | "SCTP";

export type IPFamily = "IPv4" | "IPv6" | "";

export type ServiceAffinity = "ClientIP" | "None";

export type ServiceExternalTrafficPolicy = "Cluster" | "Local";

export type ServiceInternalTrafficPolicy = "Cluster" | "Local";

export type TrafficDistribution = "PreferClose" | "PreferSameZone" | "PreferSameNode";

export interface ServicePortSpec {
  name?: string;
  protocol?: Protocol;
  appProtocol?: string;
  port: number;
  targetPort?: number | string;
  nodePort?: number;
}

export interface ServicePort extends ServicePortSpec {}

export class ServicePort {
  constructor(data: ServicePortSpec) {
    Object.assign(this, data);
  }

  toString() {
    const targetPort = this.nodePort ? `:${this.nodePort}` : this.port !== this.targetPort ? `:${this.targetPort}` : "";

    return `${this.port}${targetPort}/${this.protocol}`;
  }
}

export interface ClientIPConfigApplyConfiguration {
  timeoutSeconds?: number;
}

export interface SessionAffinityConfigApplyConfiguration {
  clientIP?: ClientIPConfigApplyConfiguration;
}

export interface ServiceSpec {
  ports?: ServicePort[];
  selector?: Partial<Record<string, string>>;
  clusterIP: string;
  clusterIPs?: string[];
  type?: ServiceType;
  externalIPs?: string[];
  sessionAffinity: ServiceAffinity;
  loadBalancerIP?: string;
  loadBalancerSourceRanges?: string[];
  externalName?: string;
  externalTrafficPolicy?: ServiceExternalTrafficPolicy;
  healthCheckNodePort?: number;
  publishNotReadyAddresses?: boolean;
  sessionAffinityConfig?: SessionAffinityConfigApplyConfiguration;
  topologyKeys?: string[];
  ipFamilies?: IPFamily[];
  ipFamilyPolicy?: string;
  allocateLoadBalancerNodePorts?: boolean;
  loadBalancerClass?: string;
  internalTrafficPolicy?: ServiceInternalTrafficPolicy;
  trafficDistribution?: TrafficDistribution;
}

export interface ServiceStatus {
  loadBalancer?: {
    ingress?: {
      ip?: string;
      hostname?: string;
    }[];
  };
}

export class Service extends KubeObject<NamespaceScopedMetadata, ServiceStatus, ServiceSpec> {
  static readonly kind = "Service";

  static readonly namespaced = true;

  static readonly apiBase = "/api/v1/services";

  getClusterIp() {
    return this.spec.clusterIP;
  }

  getClusterIps() {
    return this.spec.clusterIPs || [];
  }

  getExternalIps() {
    const lb = this.getLoadBalancer();

    if (lb?.ingress) {
      return lb.ingress.map((val) => val.ip || val.hostname);
    }

    if (Array.isArray(this.spec?.externalIPs)) {
      return this.spec.externalIPs;
    }

    return [];
  }

  getType() {
    return this.spec.type || "-";
  }

  getSelector(): string[] {
    if (!this.spec.selector) {
      return [];
    }

    return Object.entries(this.spec.selector).map((val) => val.join("="));
  }

  getPorts(): ServicePort[] {
    const ports = this.spec.ports || [];

    return ports.map((p) => new ServicePort(p));
  }

  getLoadBalancer() {
    return this.status?.loadBalancer;
  }

  isActive() {
    return this.getType() !== "LoadBalancer" || this.getExternalIps().length > 0;
  }

  getStatus() {
    return this.isActive() ? "Active" : "Pending";
  }

  getIpFamilies() {
    return this.spec.ipFamilies || [];
  }

  getIpFamilyPolicy() {
    return this.spec.ipFamilyPolicy || "";
  }
}
