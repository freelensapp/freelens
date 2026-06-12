/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { Tooltip } from "@freelensapp/tooltip";
import { observer } from "mobx-react";
import React from "react";
import { getClassName, getTooltip } from "./components";
import { sortConditions } from "./utils";

import type { KubeObjectMetadata, KubeObjectStatus } from "@freelensapp/kube-object";

export interface KubeObjectConditionsListProps {
  object: KubeObject;
  conditionTypePriorities?: Record<string, number>;
}

export const KubeObjectConditionsList = observer((props: KubeObjectConditionsListProps) => {
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
    <>
      {sortConditions(conditions, conditionTypePriorities)
        ?.filter((condition) => condition.status === "True" || condition.type === "Ready")
        ?.sort((a, b) => {
          // Always put "Ready" type first
          if (a.type === "Ready" && b.type !== "Ready") return -1;
          if (b.type === "Ready" && a.type !== "Ready") return 1;
          return 0;
        })
        ?.map((condition) => {
          const { type } = condition;
          const id = `list-${object.getId()}-condition-${type}`;
          const name = condition.status === "False" || condition.status === "Unknown" ? `Not${type}` : type;

          return (
            <div key={type} id={id} className={getClassName(condition, "condition")}>
              {name}
              <Tooltip targetId={id} formatters={{ tableView: true }}>
                {getTooltip(condition, id)}
              </Tooltip>
            </div>
          );
        })}
    </>
  );
});
