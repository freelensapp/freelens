/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isReactNode, type StrictReactNode } from "@freelensapp/utilities";
import uniqueId from "lodash/uniqueId";
import React, { useState } from "react";
import { Tooltip, type TooltipContentFormatters, type TooltipProps } from "./tooltip";

export interface TooltipDecoratorProps {
  tooltip?: StrictReactNode | Omit<TooltipProps, "targetId">;
  tooltipFormatters?: TooltipContentFormatters;
  /**
   * forces tooltip to detect the target's parent for mouse events. This is
   * useful for displaying tooltips even when the target is "disabled"
   */
  tooltipOverrideDisabled?: boolean;
  id?: string;
  children?: StrictReactNode;
}

export function withTooltip<TargetProps>(
  Target: TargetProps extends Pick<TooltipDecoratorProps, "id" | "children">
    ? React.FunctionComponent<TargetProps>
    : never,
): React.FunctionComponent<TargetProps & TooltipDecoratorProps> {
  const DecoratedComponent = (props: TargetProps & TooltipDecoratorProps) => {
    // TODO: Remove side-effect to allow deterministic unit testing
    const [defaultTooltipId] = useState(uniqueId("tooltip_target_"));

    let { id: targetId, children: targetChildren } = props;
    const {
      tooltip,
      tooltipOverrideDisabled,
      tooltipFormatters = { narrow: true },
      id: _unusedId,
      children: _unusedTargetChildren,
      ...targetProps
    } = props;

    if (tooltip) {
      const tooltipProps: TooltipProps = {
        targetId: targetId || defaultTooltipId,
        tooltipOnParentHover: tooltipOverrideDisabled,
        formatters: tooltipFormatters,
        ...(isReactNode(tooltip) ? { children: tooltip } : tooltip),
      };

      targetId = tooltipProps.targetId;
      targetChildren = (
        <>
          <div>{targetChildren}</div>
          <Tooltip {...tooltipProps} />
        </>
      );
    }

    return (
      <Target id={targetId} {...(targetProps as any)}>
        {targetChildren}
      </Target>
    );
  };

  DecoratedComponent.displayName = `withTooltip(${Target.displayName || Target.name})`;

  return DecoratedComponent;
}
