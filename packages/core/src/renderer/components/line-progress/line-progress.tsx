/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./line-progress.scss";

import { withTooltip } from "@freelensapp/tooltip";
import { cssNames } from "@freelensapp/utilities";
import React from "react";

import type { StrictReactNode } from "@freelensapp/utilities";

export interface LineProgressProps extends React.HTMLProps<HTMLDivElement> {
  value: number;
  /**
   * Optional second value rendered as a lighter line behind the main one,
   * e.g. resource requests behind actual usage.
   */
  secondaryValue?: number;
  /**
   * Optional third value rendered as a tinted line behind the main one,
   * e.g. container working set behind node memory usage.
   */
  tertiaryValue?: number;
  min?: number;
  max?: number;
  className?: any;
  precise?: number;
  children?: StrictReactNode;
}

function valuePercent({
  value,
  min,
  max,
  precise,
}: Required<Pick<LineProgressProps, "value" | "min" | "max" | "precise">>) {
  return Math.min(100, (value / (max - min)) * 100).toFixed(precise);
}

export const LineProgress = withTooltip(
  ({ className, min = 0, max = 100, value, secondaryValue, tertiaryValue, precise = 2, children, ...props }: LineProgressProps) => (
    <div className={cssNames("LineProgress", className)} {...props}>
      {secondaryValue !== undefined && (
        <div
          className="line secondary"
          style={{
            width: `${valuePercent({ min, max, value: secondaryValue, precise })}%`,
          }}
        />
      )}
      {tertiaryValue !== undefined && (
        <div
          className="line tertiary"
          style={{
            width: `${valuePercent({ min, max, value: tertiaryValue, precise })}%`,
          }}
        />
      )}
      <div
        className="line"
        style={{
          width: `${valuePercent({ min, max, value, precise })}%`,
        }}
      />
      {children}
    </div>
  ),
);
