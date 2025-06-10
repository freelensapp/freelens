/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import autoBind from "auto-bind";
import type {
  KubeJsonApiData,
  KubeObjectMetadata,
  KubeObjectScope,
  NamespaceScopedMetadata,
  ObjectReference,
} from "../api-types";
import { KubeObject } from "../kube-object";
import { EndpointConditions, EndpointHints, EndpointPort } from "./endpoint";

export interface Endpoint {
  addresses: string[];
  conditions?: EndpointConditions;
  deprecatedTopology: Record<string, string>;
  hints?: EndpointHints;
  hostname?: string;
  nodeName?: string;
  targetRef?: ObjectReference;
  zone?: string;
}

export interface EndpointSliceData extends KubeJsonApiData<KubeObjectMetadata<KubeObjectScope.Namespace>, void, void> {
  addressType: string;
  endpoints: Endpoint[];
  ports?: EndpointPort[];
}

export interface EndpointSliceSpec {}

export class EndpointSlice extends KubeObject<NamespaceScopedMetadata, void, void> {
  static kind = "EndpointSlice";
  static namespaced = true;
  static apiBase = "/apis/discovery.k8s.io/v1/endpointslices";

  addressType: string;
  endpoints: Endpoint[] | null;
  ports?: EndpointPort[] | null;

  getPortsString(): string {
    return this.ports?.map((port) => `${port.port}/${port.protocol ?? "TCP"}`).join(", ") ?? "";
  }

  getEndpointsString(): string {
    return (
      this.endpoints
        ?.map((endpoint) => endpoint.addresses)
        .flat()
        .join(", ") ?? ""
    );
  }

  constructor({ addressType, endpoints, ports, ...rest }: EndpointSliceData) {
    super(rest);
    autoBind(this);
    this.addressType = addressType;
    this.endpoints = endpoints;
    this.ports = ports;
  }
}
