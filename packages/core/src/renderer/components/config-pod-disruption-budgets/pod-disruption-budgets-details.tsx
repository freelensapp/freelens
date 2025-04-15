/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-disruption-budgets-details.scss";

import type { PodDisruptionBudget } from "@freelensapp/kube-object";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface PodDisruptionBudgetDetailsProps extends KubeObjectDetailsProps<PodDisruptionBudget> {}

export const PodDisruptionBudgetDetails = observer((props: PodDisruptionBudgetDetailsProps) => {
  const { object: pdb } = props;

  if (!pdb) {
    return null;
  }

  const selectors = pdb.getSelectors();

  return (
    <div className="PdbDetails">
      {selectors.length > 0 && (
        <DrawerItem name="Selector" labelsOnly>
          {selectors.map((label) => (
            <Badge key={label} label={label} />
          ))}
        </DrawerItem>
      )}

      <DrawerItem name="Min Available">{pdb.getMinAvailable()}</DrawerItem>

      <DrawerItem name="Max Unavailable">{pdb.getMaxUnavailable()}</DrawerItem>

      <DrawerItem name="Current Healthy">{pdb.getCurrentHealthy()}</DrawerItem>

      <DrawerItem name="Desired Healthy">{pdb.getDesiredHealthy()}</DrawerItem>
    </div>
  );
});
