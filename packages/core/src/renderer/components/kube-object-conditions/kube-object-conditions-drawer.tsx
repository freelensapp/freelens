/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { cssNames } from "@freelensapp/utilities/dist";
import { upperFirst } from "lodash/fp";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import { sortConditions } from "./utils";

import type { Condition, KubeObjectMetadata, KubeObjectStatus } from "@freelensapp/kube-object";

export interface KubeObjectConditionsDrawerProps {
  object: KubeObject;
  conditionTypePriorities?: Record<string, number>;
}

function getTooltip(condition: Condition, id: string) {
  return (
    <>
      {Object.entries(condition)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(
          ([key, value]) =>
            value !== undefined &&
            value !== null && (
              <div key={key} className="flex gaps align-center">
                <div className="name">{upperFirst(key)}</div>
                <div className="value">{value}</div>
              </div>
            ),
        )}
    </>
  );
}

function getClassName(condition: Condition) {
  if (condition.status === "False") {
    return cssNames("False");
  }
  return cssNames(condition.type, condition.reason);
}

export const KubeObjectConditionsDrawer = observer((props: KubeObjectConditionsDrawerProps) => {
  const { object, conditionTypePriorities } = props;

  if (!object) {
    return null;
  }

  if (!(object instanceof KubeObject)) {
    return null;
  }

  const conditions = (object as KubeObject<KubeObjectMetadata, KubeObjectStatus>).status?.conditions;

  if (!conditions?.length) return null;

  return (
    <DrawerItem name="Conditions" className="conditions" hidden={conditions.length === 0} labelsOnly>
      {sortConditions(conditions, conditionTypePriorities)?.map((condition) => {
        return (
          <Badge
            key={condition.type}
            label={condition.type}
            disabled={condition.status === "False"}
            tooltip={getTooltip(condition, `drawer-${object.getId()}-condition-${condition.type}`)}
            tooltipFormatters={{ tableView: true }}
            className={getClassName(condition)}
          />
        );
      })}
    </DrawerItem>
  );
});
