/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-ports-cell.scss";

import React, { useMemo } from "react";
import { WithTooltip } from "../with-tooltip";

import type { ContainerPort, Pod } from "@freelensapp/kube-object";

export interface PodPortsCellProps {
  pod: Pod;
}

export function getPodContainerPorts(pod: Pod): ContainerPort[] {
  return pod.getContainers().flatMap((container) => container.ports ?? []);
}

/**
 * Format a single ContainerPort to a readable string.
 * Examples: "80/TCP", "http:8080/TCP"
 */
function formatPort(port: ContainerPort) {
  const name = port.name ? `${port.name}:` : "";
  const protocol = port.protocol ?? "TCP";

  return `${name}${port.containerPort}/${protocol}`;
}

export const PodPortsCell = ({ pod }: PodPortsCellProps) => {
  const ports = useMemo(() => getPodContainerPorts(pod), [pod]);

  if (ports.length === 0) {
    return <span className="PodPortsCell none">-</span>;
  }

  const label = ports.map((port) => port.containerPort).join(", ");
  const tooltip = ports.map(formatPort).join(", ");

  return (
    <div className="PodPortsCell">
      <WithTooltip tooltip={tooltip}>{label}</WithTooltip>
    </div>
  );
};

export default PodPortsCell;
