/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Shared types for Gateway API resources.
 * See: https://gateway-api.sigs.k8s.io/reference/spec/
 */

/**
 * Valid parent kinds for Gateway API routes.
 * Routes can attach to Gateways or other route types depending on the configuration.
 */
export type GatewayApiRouteKind = "Gateway" | "GRPCRoute" | "HTTPRoute" | "TCPRoute" | "TLSRoute" | "UDPRoute";

/**
 * Valid backend kinds for Gateway API routes.
 * Currently only Service is supported, but this may expand in future API versions.
 */
export type GatewayApiBackendKind = "Service";
