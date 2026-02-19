/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import { renderBackendLinks, renderParentRefLinks } from "./gateway-api-route-details";

import type { KubeObject } from "@freelensapp/kube-object";

import type { GatewayApiBackendRefRow, GatewayApiParentRefRow } from "./gateway-api-route-details";

export enum GatewayClassColumnId {
  name = "name",
  controller = "controller",
  accepted = "accepted",
  age = "age",
}

export const gatewayClassTableHeaders = [
  { title: "Name", className: "name", sortBy: GatewayClassColumnId.name, id: GatewayClassColumnId.name },
  {
    title: "Controller",
    className: "controller",
    sortBy: GatewayClassColumnId.controller,
    id: GatewayClassColumnId.controller,
  },
  { title: "Accepted", className: "accepted", id: GatewayClassColumnId.accepted },
  { title: "Age", className: "age", sortBy: GatewayClassColumnId.age, id: GatewayClassColumnId.age },
];

export enum GatewayColumnId {
  name = "name",
  namespace = "namespace",
  class = "class",
  addresses = "addresses",
  listeners = "listeners",
  ready = "ready",
  age = "age",
}

export const gatewayTableHeaders = [
  { title: "Name", className: "name", sortBy: GatewayColumnId.name, id: GatewayColumnId.name },
  { title: "Namespace", className: "namespace", sortBy: GatewayColumnId.namespace, id: GatewayColumnId.namespace },
  { title: "Class", className: "class", sortBy: GatewayColumnId.class, id: GatewayColumnId.class },
  { title: "Addresses", className: "addresses", id: GatewayColumnId.addresses },
  { title: "Listeners", className: "listeners", id: GatewayColumnId.listeners },
  { title: "Ready", className: "ready", id: GatewayColumnId.ready },
  { title: "Age", className: "age", sortBy: GatewayColumnId.age, id: GatewayColumnId.age },
];

export enum GatewayApiRouteColumnId {
  name = "name",
  namespace = "namespace",
  hostnames = "hostnames",
  parentRefs = "parentRefs",
  rules = "rules",
  accepted = "accepted",
  age = "age",
}

export const gatewayApiRouteTableHeaders = [
  { title: "Name", className: "name", sortBy: GatewayApiRouteColumnId.name, id: GatewayApiRouteColumnId.name },
  {
    title: "Namespace",
    className: "namespace",
    sortBy: GatewayApiRouteColumnId.namespace,
    id: GatewayApiRouteColumnId.namespace,
  },
  { title: "Hostnames", className: "hostnames", id: GatewayApiRouteColumnId.hostnames },
  { title: "Parent Refs", className: "parentRefs", id: GatewayApiRouteColumnId.parentRefs },
  { title: "Rules", className: "rules", id: GatewayApiRouteColumnId.rules },
  { title: "Accepted", className: "accepted", id: GatewayApiRouteColumnId.accepted },
  { title: "Age", className: "age", sortBy: GatewayApiRouteColumnId.age, id: GatewayApiRouteColumnId.age },
];

export enum ReferenceGrantColumnId {
  name = "name",
  namespace = "namespace",
  from = "from",
  to = "to",
  age = "age",
}

export const referenceGrantTableHeaders = [
  { title: "Name", className: "name", sortBy: ReferenceGrantColumnId.name, id: ReferenceGrantColumnId.name },
  {
    title: "Namespace",
    className: "namespace",
    sortBy: ReferenceGrantColumnId.namespace,
    id: ReferenceGrantColumnId.namespace,
  },
  { title: "From", className: "from", id: ReferenceGrantColumnId.from },
  { title: "To", className: "to", id: ReferenceGrantColumnId.to },
  { title: "Age", className: "age", sortBy: ReferenceGrantColumnId.age, id: ReferenceGrantColumnId.age },
];

export enum GatewayApiStreamRouteColumnId {
  name = "name",
  namespace = "namespace",
  parentRefs = "parentRefs",
  backends = "backends",
  accepted = "accepted",
  age = "age",
}

export const gatewayApiStreamRouteTableHeaders = [
  {
    title: "Name",
    className: "name",
    sortBy: GatewayApiStreamRouteColumnId.name,
    id: GatewayApiStreamRouteColumnId.name,
  },
  {
    title: "Namespace",
    className: "namespace",
    sortBy: GatewayApiStreamRouteColumnId.namespace,
    id: GatewayApiStreamRouteColumnId.namespace,
  },
  { title: "Parent Refs", className: "parentRefs", id: GatewayApiStreamRouteColumnId.parentRefs },
  { title: "Backends", className: "backends", id: GatewayApiStreamRouteColumnId.backends },
  { title: "Accepted", className: "accepted", id: GatewayApiStreamRouteColumnId.accepted },
  { title: "Age", className: "age", sortBy: GatewayApiStreamRouteColumnId.age, id: GatewayApiStreamRouteColumnId.age },
];

export enum GatewayApiTlsRouteColumnId {
  name = "name",
  namespace = "namespace",
  hostnames = "hostnames",
  parentRefs = "parentRefs",
  backends = "backends",
  accepted = "accepted",
  age = "age",
}

export const gatewayApiTlsRouteTableHeaders = [
  { title: "Name", className: "name", sortBy: GatewayApiTlsRouteColumnId.name, id: GatewayApiTlsRouteColumnId.name },
  {
    title: "Namespace",
    className: "namespace",
    sortBy: GatewayApiTlsRouteColumnId.namespace,
    id: GatewayApiTlsRouteColumnId.namespace,
  },
  { title: "Hostnames", className: "hostnames", id: GatewayApiTlsRouteColumnId.hostnames },
  { title: "Parent Refs", className: "parentRefs", id: GatewayApiTlsRouteColumnId.parentRefs },
  { title: "Backends", className: "backends", id: GatewayApiTlsRouteColumnId.backends },
  { title: "Accepted", className: "accepted", id: GatewayApiTlsRouteColumnId.accepted },
  { title: "Age", className: "age", sortBy: GatewayApiTlsRouteColumnId.age, id: GatewayApiTlsRouteColumnId.age },
];

export interface GatewayApiRouteLike extends KubeObject {
  getHostnames(): string[];
  getParentRefs(): GatewayApiParentRefRow[];
  getRoutes(): unknown[];
  getSearchFields(): string[];
  getNs(): string;
  getName(): string;
  getCreationTimestamp(): number;
}

export interface GatewayApiStreamRouteLike extends KubeObject {
  getParentRefs(): GatewayApiParentRefRow[];
  getBackendRefs(): GatewayApiBackendRefRow[];
  getSearchFields(): string[];
  getNs(): string;
  getName(): string;
  getCreationTimestamp(): number;
}

export interface GatewayApiTlsRouteLike extends GatewayApiStreamRouteLike {
  getHostnames(): string[];
}

export const formatRouteHostnames = (hostnames: string[]) => {
  if (hostnames.length === 0) {
    return { label: "*", tooltip: "*" };
  }

  const label = hostnames.slice(0, 2).join(", ") + (hostnames.length > 2 ? "..." : "");

  return { label, tooltip: hostnames.join(", ") };
};

export const formatRulesLabel = (count: number) => `${count} rule(s)`;

export const getGatewayApiRouteSortingCallbacks = <T extends GatewayApiRouteLike>() => ({
  [GatewayApiRouteColumnId.name]: (item: T) => item.getName(),
  [GatewayApiRouteColumnId.namespace]: (item: T) => item.getNs(),
  [GatewayApiRouteColumnId.age]: (item: T) => -item.getCreationTimestamp(),
});

export const getGatewayApiRouteSearchFilters = <T extends GatewayApiRouteLike>() => [
  (item: T) => item.getSearchFields(),
  (item: T) => item.getHostnames(),
];

export const getGatewayApiStreamRouteSortingCallbacks = <T extends GatewayApiStreamRouteLike>() => ({
  [GatewayApiStreamRouteColumnId.name]: (item: T) => item.getName(),
  [GatewayApiStreamRouteColumnId.namespace]: (item: T) => item.getNs(),
  [GatewayApiStreamRouteColumnId.age]: (item: T) => -item.getCreationTimestamp(),
});

export const getGatewayApiStreamRouteSearchFilters = <T extends GatewayApiStreamRouteLike>() => [
  (item: T) => item.getSearchFields(),
];

export const getGatewayApiTlsRouteSortingCallbacks = <T extends GatewayApiTlsRouteLike>() => ({
  [GatewayApiTlsRouteColumnId.name]: (item: T) => item.getName(),
  [GatewayApiTlsRouteColumnId.namespace]: (item: T) => item.getNs(),
  [GatewayApiTlsRouteColumnId.age]: (item: T) => -item.getCreationTimestamp(),
});

export const getGatewayApiTlsRouteSearchFilters = <T extends GatewayApiTlsRouteLike>() => [
  (item: T) => item.getSearchFields(),
  (item: T) => item.getHostnames(),
];

export const renderGatewayApiRouteTableContents = <T extends GatewayApiRouteLike>(item: T) => {
  const { label, tooltip } = formatRouteHostnames(item.getHostnames());
  const rulesLabel = formatRulesLabel(item.getRoutes().length);

  return [
    <WithTooltip key="name">{item.getName()}</WithTooltip>,
    <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
    <WithTooltip key="hostnames" tooltip={tooltip}>
      {label}
    </WithTooltip>,
    <React.Fragment key="parentRefs">{renderParentRefLinks(item, item.getParentRefs())}</React.Fragment>,
    <WithTooltip key="rules">{rulesLabel}</WithTooltip>,
    <KubeObjectStatusIcon key="accepted" object={item} />,
    <KubeObjectAge key="age" object={item} />,
  ];
};

export const renderGatewayApiStreamRouteTableContents = <T extends GatewayApiStreamRouteLike>(item: T) => [
  <WithTooltip key="name">{item.getName()}</WithTooltip>,
  <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
  <React.Fragment key="parentRefs">{renderParentRefLinks(item, item.getParentRefs())}</React.Fragment>,
  <React.Fragment key="backends">{renderBackendLinks(item, item.getBackendRefs())}</React.Fragment>,
  <KubeObjectStatusIcon key="accepted" object={item} />,
  <KubeObjectAge key="age" object={item} />,
];

export const renderGatewayApiTlsRouteTableContents = <T extends GatewayApiTlsRouteLike>(item: T) => {
  const { label, tooltip } = formatRouteHostnames(item.getHostnames());

  return [
    <WithTooltip key="name">{item.getName()}</WithTooltip>,
    <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
    <WithTooltip key="hostnames" tooltip={tooltip}>
      {label}
    </WithTooltip>,
    <React.Fragment key="parentRefs">{renderParentRefLinks(item, item.getParentRefs())}</React.Fragment>,
    <React.Fragment key="backends">{renderBackendLinks(item, item.getBackendRefs())}</React.Fragment>,
    <KubeObjectStatusIcon key="accepted" object={item} />,
    <KubeObjectAge key="age" object={item} />,
  ];
};
