/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { StrictReactNode } from "@freelensapp/utilities/dist";
import React from "react";
import { Badge } from "../badge/badge";
import { LocaleDate } from "../locale-date";

export interface WithTooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
  expandable?: boolean;
  children?: StrictReactNode;
  tooltip?: string | Date | StrictReactNode;
  "data-testid"?: string;
}

export function WithTooltip(props: WithTooltipProps) {
  let tooltip: StrictReactNode;
  if (props.tooltip instanceof Date) {
    tooltip = <LocaleDate date={props.tooltip} />;
  } else if (props.tooltip !== undefined) {
    tooltip = props.tooltip;
  } else {
    tooltip = props.children ?? "";
  }
  return (
    <Badge
      label={props.children}
      tooltip={tooltip}
      flat={props.flat ?? true}
      expandable={props.expandable ?? true}
      data-testid={props["data-testid"]}
    />
  );
}
