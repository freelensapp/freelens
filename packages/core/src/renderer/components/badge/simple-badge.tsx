/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { StrictReactNode } from "@freelensapp/utilities/dist";
import React from "react";
import { Badge } from "./badge";

export interface SimpleBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
  expandable?: boolean;
  children?: StrictReactNode;
}

export function SimpleBadge(props: SimpleBadgeProps) {
  return (
    <Badge
      label={props.children}
      tooltip={props.children}
      flat={props.flat ?? true}
      expandable={props.expandable ?? true}
    />
  );
}
