/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./sub-title.scss";
import React from "react";
import type { StrictReactNode } from "@freelens/utilities";
import { cssNames } from "@freelens/utilities";

export interface SubTitleProps {
  className?: string;
  title: StrictReactNode;
  compact?: boolean; // no bottom padding
  id?: string;
  children?: StrictReactNode;
}

export class SubTitle extends React.Component<SubTitleProps> {
  render() {
    const { className, compact, title, children, id } = this.props;
    const classNames = cssNames("SubTitle", className, {
      compact,
    });

    return (
      <div className={classNames} id={id}>
        {title}
        {" "}
        {children}
      </div>
    );
  }
}
