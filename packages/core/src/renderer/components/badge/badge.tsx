/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withTooltip } from "@freelensapp/tooltip";
import { cssNames } from "@freelensapp/utilities";
import { action, observable } from "mobx";
import { observer } from "mobx-react";
import React, { useEffect, useRef, useState } from "react";
import styles from "./badge.module.scss";

import type { StrictReactNode } from "@freelensapp/utilities";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  small?: boolean;
  flat?: boolean;
  label?: StrictReactNode;
  expandable?: boolean;
  disabled?: boolean;
  scrollable?: boolean;
  children?: StrictReactNode;
}

// Common handler for all Badge instances
document.addEventListener("selectionchange", () => {
  badgeMeta.hasTextSelected ||= (window.getSelection()?.toString().trim().length ?? 0) > 0;
});

const badgeMeta = observable({
  hasTextSelected: false,
});

export const Badge = withTooltip(
  observer(
    ({
      small,
      flat,
      label,
      expandable = true,
      disabled,
      scrollable,
      className,
      children,
      ...elemProps
    }: BadgeProps) => {
      const elem = useRef<HTMLDivElement>(null);
      const [isExpanded, setIsExpanded] = useState(false);
      const [isExpandable, setIsExpandable] = useState(false);

      useEffect(() => {
        const { clientWidth = 0, scrollWidth = 0 } = elem.current ?? {};

        setIsExpandable(expandable && clientWidth < scrollWidth);
      }, [expandable, elem.current]);

      const onMouseUp = action(() => {
        if (!isExpandable || badgeMeta.hasTextSelected) {
          badgeMeta.hasTextSelected = false;
        } else {
          setIsExpanded(!isExpanded);
        }
      });

      return (
        <div
          {...elemProps}
          className={cssNames(styles.badge, className, {
            [styles.small]: small,
            [styles.flat]: flat,
            [styles.clickable]: Boolean(elemProps.onClick) || isExpandable,
            [styles.interactive]: isExpandable,
            [styles.isExpanded]: isExpanded,
            [styles.disabled]: disabled,
            [styles.scrollable]: scrollable,
          })}
          onMouseUp={onMouseUp}
          ref={elem}
        >
          {label}
          {children}
        </div>
      );
    },
  ),
);
