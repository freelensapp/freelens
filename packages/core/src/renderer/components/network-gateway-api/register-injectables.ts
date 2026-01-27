/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import backendLBPolicyStoreInjectable from "./backend-lb-policy-store.injectable";
import backendTLSPolicyStoreInjectable from "./backend-tls-policy-store.injectable";
import gatewayClassStoreInjectable from "./gateway-class-store.injectable";
import gatewayStoreInjectable from "./gateway-store.injectable";
import grpcRouteStoreInjectable from "./grpc-route-store.injectable";
import httpRouteStoreInjectable from "./http-route-store.injectable";
import referenceGrantStoreInjectable from "./reference-grant-store.injectable";
import tcpRouteStoreInjectable from "./tcp-route-store.injectable";
import tlsRouteStoreInjectable from "./tls-route-store.injectable";
import udpRouteStoreInjectable from "./udp-route-store.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
  try {
    di.register(backendLBPolicyStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(backendTLSPolicyStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(gatewayClassStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(gatewayStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(grpcRouteStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(httpRouteStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(referenceGrantStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(tcpRouteStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(tlsRouteStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
  try {
    di.register(udpRouteStoreInjectable);
  } catch {
    /* Ignore duplicate registration */
  }
}
