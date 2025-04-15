/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./button.scss";
import { withTooltip } from "@freelensapp/tooltip";
import { type StrictReactNode, cssNames } from "@freelensapp/utilities";
import React, { type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<any> {
  label?: StrictReactNode;
  waiting?: boolean;
  primary?: boolean;
  accent?: boolean;
  light?: boolean;
  plain?: boolean;
  outlined?: boolean;
  hidden?: boolean;
  active?: boolean;
  big?: boolean;
  round?: boolean;
  href?: string; // render as hyperlink
  target?: "_blank"; // in case of using @href
  children?: StrictReactNode;
}

export const Button = withTooltip((props: ButtonProps) => {
  const { waiting, label, primary, accent, plain, hidden, active, big, round, outlined, light, children, ...btnProps } =
    props;

  if (hidden) {
    return null;
  }

  btnProps.className = cssNames("Button", btnProps.className, {
    waiting,
    primary,
    accent,
    plain,
    active,
    big,
    round,
    outlined,
    light,
  });

  // render as link
  if (props.href) {
    return (
      <a {...btnProps}>
        {label}
        {children}
      </a>
    );
  }

  // render as button
  return (
    <button type="button" {...btnProps} data-waiting={typeof waiting === "boolean" ? String(waiting) : undefined}>
      {label}
      {children}
    </button>
  );
});
