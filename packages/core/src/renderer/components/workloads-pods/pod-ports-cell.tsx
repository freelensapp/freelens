/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-ports-cell.scss";

import React, { useMemo, useState } from "react";
import { WithTooltip } from "../with-tooltip";

import type { Pod, ContainerPort } from "@freelensapp/kube-object";

export interface PodPortsCellProps {
  pod: Pod;
  maxVisible?: number; // default 2
}

/**
 * Format a single ContainerPort to a readable string.
 * Examples: "80/TCP", "http:8080/TCP"
 */
function formatPort(port: ContainerPort) {
  const proto = port.protocol ?? "TCP";
  const name = port.name ? `${port.name}:` : "";
  return `${name}${port.containerPort}/${proto}`;
}

export const PodPortsCell = ({ pod, maxVisible = 2 }: PodPortsCellProps) => {
  const [expanded, setExpanded] = useState(false);

  // Collect ports from regular containers. Keeps the original order.
  const ports = useMemo(() => {
    const containers = pod.getContainers() ?? [];
    const items: ContainerPort[] = [];

    for (const c of containers) {
      if (c.ports && c.ports.length) {
        items.push(...c.ports);
      }
    }

    return items;
  }, [pod]);

  if (!ports || ports.length === 0) {
    return <span className="PodPortsCell none">-</span>;
  }

  const formatted = ports.map(formatPort);

  if (expanded) {
    return (
      <div className="PodPortsCell expanded">
        {formatted.map((p, i) => (
          <WithTooltip key={i}>
            <span className="PodPortsCell__item">{p}</span>
          </WithTooltip>
        ))}
        {formatted.length > maxVisible && (
          <button
            className="PodPortsCell__toggle"
            onClick={() => setExpanded(false)}
            aria-label="Show less ports"
            type="button"
          >
            show less
          </button>
        )}
      </div>
    );
  }

  const visible = formatted.slice(0, maxVisible).join(", ");
  const hasMore = formatted.length > maxVisible;

  return (
    <div className="PodPortsCell">
      <span className="PodPortsCell__visible">{visible}</span>
      {hasMore && (
        <button
          className="PodPortsCell__more"
          onClick={() => setExpanded(true)}
          aria-label="Show more ports"
          type="button"
        >
          ...
        </button>
      )}
    </div>
  );
};

export default PodPortsCell;
