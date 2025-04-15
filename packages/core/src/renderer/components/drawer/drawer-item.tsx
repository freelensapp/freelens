/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./drawer-item.scss";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames } from "@freelensapp/utilities";
import React from "react";

export interface DrawerItemProps extends React.HTMLAttributes<HTMLDivElement> {
  name: StrictReactNode;
  title?: string;
  labelsOnly?: boolean;
  hidden?: boolean;

  /**
   * @deprecated This prop is no longer used, you should stringify the booleans yourself.
   *
   * This was only meant to be an internal prop anyway.
   */
  renderBooleans?: boolean;
}

export function DrawerItem({
  name,
  title,
  labelsOnly,
  children,
  hidden = false,
  className,
  ...elemProps
}: DrawerItemProps) {
  if (hidden) {
    return null;
  }

  return (
    <div {...elemProps} className={cssNames("DrawerItem", className, { labelsOnly })} title={title}>
      <span className="name">{name}</span>
      <span className="value">{children}</span>
    </div>
  );
}
