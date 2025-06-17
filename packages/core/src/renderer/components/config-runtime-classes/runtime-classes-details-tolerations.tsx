/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./runtime-classes-details-tolerations.scss";

import React from "react";
import { DrawerItem, DrawerParamToggler } from "../drawer";
import { RuntimeClassTolerations } from "./runtime-classes-tolerations";

import type { KubeObject, Toleration } from "@freelensapp/kube-object";

export interface KubeObjectWithTolerations extends KubeObject {
  getTolerations(): Toleration[];
}

export interface RuntimeClassDetailsTolerationsProps {
  runtimeClass: KubeObjectWithTolerations;
}

export function RuntimeClassDetailsTolerations({ runtimeClass: runtimeClass }: RuntimeClassDetailsTolerationsProps) {
  const tolerations = runtimeClass.getTolerations();

  if (!tolerations.length) return null;

  return (
    <DrawerItem name="Tolerations" className="RuntimeClassDetailsTolerations">
      <DrawerParamToggler label={tolerations.length}>
        <RuntimeClassTolerations tolerations={tolerations} />
      </DrawerParamToggler>
    </DrawerItem>
  );
}
