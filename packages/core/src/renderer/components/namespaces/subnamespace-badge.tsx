/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Tooltip } from "@freelensapp/tooltip";
import { cssNames } from "@freelensapp/utilities";
import React from "react";
import styles from "./subnamespace-badge.module.scss";

interface SubnamespaceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  id: string;
}

export function SubnamespaceBadge({ id, className, ...other }: SubnamespaceBadgeProps) {
  return (
    <>
      <span className={cssNames(styles.subnamespaceBadge, className)} data-testid={id} id={id} {...other}>
        S
      </span>
      <Tooltip targetId={id}>Subnamespace</Tooltip>
    </>
  );
}
