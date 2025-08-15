/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits, unitsToBytes } from "@freelensapp/utilities";
import React from "react";
import { DrawerItem } from "../drawer";
import { WithTooltip } from "../with-tooltip";

import type { Node } from "@freelensapp/kube-object";

export interface NodeDetailsResourcesProps {
  node: Node;
  type: "allocatable" | "capacity";
}

export function NodeDetailsResources({ type, node: { status = {} } }: NodeDetailsResourcesProps) {
  const resourceStatus = status[type];

  if (!resourceStatus) {
    return null;
  }

  return (
    <div className="NodeDetailsResources">
      {Object.entries(resourceStatus).map(([key, value]) => {
        let tooltip = null;
        if (value === undefined) return null;
        if (value === null) return null;
        if (key === "ephemeral-storage" || key === "memory") {
          const newValue = bytesToUnits(unitsToBytes(value));
          if (newValue !== "N/A") {
            tooltip = value;
            value = newValue;
          }
        }
        return (
          <DrawerItem key={key} name={key}>
            <WithTooltip tooltip={tooltip}>
              <span>{value}</span>
            </WithTooltip>
          </DrawerItem>
        );
      })}
    </div>
  );
}
