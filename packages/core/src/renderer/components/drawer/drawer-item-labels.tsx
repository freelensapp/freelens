/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import React from "react";
import { Badge } from "../badge";
import type { DrawerItemProps } from "./drawer-item";
import { DrawerItem } from "./drawer-item";

export interface DrawerItemLabelsProps extends DrawerItemProps {
  labels: string[] | Partial<Record<string, string>>;
}

export function DrawerItemLabels(props: DrawerItemLabelsProps) {
  const { labels, ...itemProps } = props;

  if (!labels || typeof labels !== "object") {
    return null;
  }

  const labelStrings = Array.isArray(labels) ? labels : KubeObject.stringifyLabels(labels);

  if (labelStrings.length === 0) {
    return null;
  }

  return (
    <DrawerItem {...itemProps} labelsOnly>
      {labelStrings.map((label) => (
        <Badge key={label} label={label} title={label} />
      ))}
    </DrawerItem>
  );
}
