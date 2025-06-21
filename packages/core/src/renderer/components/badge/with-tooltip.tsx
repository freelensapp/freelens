/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { StrictReactNode } from "@freelensapp/utilities/dist";
import React from "react";
import { LocaleDate } from "../locale-date";
import { Badge } from "./badge";

export interface WithTooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
  expandable?: boolean;
  children?: StrictReactNode;
  tooltip?: string | Date | StrictReactNode;
}

export function WithTooltip(props: WithTooltipProps) {
  let tooltip: StrictReactNode;
  if (props.tooltip instanceof Date) {
    tooltip = <LocaleDate date={props.tooltip.toISOString()} />;
  } else if (props.tooltip !== undefined) {
    tooltip = props.tooltip;
  } else {
    tooltip = props.children ?? "";
  }
  return (
    <Badge label={props.children} tooltip={tooltip} flat={props.flat ?? true} expandable={props.expandable ?? true} />
  );
}
