/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./drawer-title.scss";
import React from "react";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames } from "@freelensapp/utilities";

export interface DrawerTitleProps {
  className?: string;
  children?: StrictReactNode;

  /**
   * @deprecated Prefer passing the value as `children`
   */
  title?: StrictReactNode;

  /**
   * Specifies how large this title is
   *
   * @default "title"
   */
  size?: "sub-title" | "title";
}

export function DrawerTitle({ className, children, size = "title" }: DrawerTitleProps) {
  return (
    <div
      className={cssNames("DrawerTitle", className, {
        title: size === "title",
        "sub-title": size === "sub-title",
      })}
    >
      {children}
    </div>
  );
}
