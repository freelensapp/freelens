/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { Tooltip } from "@freelensapp/tooltip";
import { cssNames } from "@freelensapp/utilities/dist";
import { upperFirst } from "lodash/fp";
import { observer } from "mobx-react";
import React from "react";
import { sortConditions } from "./utils";

import type { Condition, KubeObjectMetadata, KubeObjectStatus } from "@freelensapp/kube-object";

function getClassName(condition: Condition) {
  if (condition.status === "False") {
    return cssNames("condition", "False");
  }
  return cssNames("condition", condition.type, condition.reason);
}

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
        ?.filter((condition) => condition.status === "True")
        ?.map((condition) => {
          const { type } = condition;
          const id = `list-${object.getId()}-condition-${type}`;

          return (
            <div key={type} id={id} className={getClassName(condition)}>
              {type}
              <Tooltip targetId={id} formatters={{ tableView: true }}>
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
              </Tooltip>
            </div>
          );
        })}
    </>
  );
});
