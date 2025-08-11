/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import moment from "moment-timezone";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { DurationAbsoluteTimestamp } from "../events";

import type { Condition, KubeObjectStatus } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";

import "./kube-object-conditions.scss";

export interface KubeObjectConditionsProps {
  object: KubeObject<any, KubeObjectStatus, any>;
}

interface Dependencies {
  logger: Logger;
}

function timeToUnix(dateStr?: string): number {
  const m = moment(dateStr);
  return m.isValid() ? m.unix() : 0;
}

const defaultConditionTypePriorities = {
  PodScheduled: 1,
  PodReadyToStartContainers: 2,
  ContainersReady: 3,
  Initialized: 4,
  Ready: 5,
};

/**
 * Sort conditions (the newer first) using heuristic: first sorts fields by
 * date and if the date is the same then checks priority from the object.
 */
export function sortConditions(
  conditions: Condition[],
  conditionTypePriorities: Record<string, number> = defaultConditionTypePriorities,
): Condition[] | undefined {
  return conditions?.sort(
    (a, b) =>
      timeToUnix(b.lastTransitionTime) - timeToUnix(a.lastTransitionTime) ||
      (conditionTypePriorities[b.type] ?? 0) - (conditionTypePriorities[a.type] ?? 0),
  );
}

export function getLastCondition(conditions: Condition[]): Condition | undefined {
  return (sortConditions(conditions) ?? [])[0];
}

export function getConditionText(conditions?: Condition[]) {
  if (!conditions || !conditions.length) return "Unknown";
  const condition = getLastCondition(conditions);
  if ("suspend" in conditions && conditions.suspend) return "Suspended";
  if (condition?.status === "True") return "Ready";
  if (condition?.status === "False") return "Not Ready";
  if (conditions) return "In Progress";
  return "Unknown";
}

export function getConditionMessage(conditions?: Condition[]) {
  if (!conditions || !conditions.length) return;
  return getLastCondition(conditions)?.message;
}

/**
 * Returns a CSS class name that is defined in the main application.
 */
export function getConditionClass(conditions?: Condition[]) {
  const status = getConditionText(conditions);
  switch (status) {
    case "Ready":
      return "success";
    case "Not Ready":
      return "error";
    case "Suspended":
      return "info";
    case "In Progress":
      return "warning";
    default:
      return "";
  }
}

const NonInjectedKubeObjectConditions = observer((props: Dependencies & KubeObjectConditionsProps) => {
  const { object, logger } = props;

  if (!object) {
    return null;
  }

  if (!(object instanceof KubeObject)) {
    logger.error("[KubeObjectConditions]: passed object that is not an instanceof KubeObject", object);

    return null;
  }

  const conditions = object.status?.conditions;

  if (!conditions) return null;

  return (
    <div className="KubeObjectConditions">
      <DrawerTitle>Conditions</DrawerTitle>
      {sortConditions(conditions)?.map((condition, idx) => (
        <div key={idx}>
          <div className="title">
            <Icon small material="list" />
          </div>
          <DrawerItem name="Last Transition Time" hidden={!condition.lastTransitionTime}>
            <DurationAbsoluteTimestamp timestamp={condition.lastTransitionTime} />
          </DrawerItem>
          <DrawerItem name="Reason" hidden={!condition.reason}>
            {condition.reason}
          </DrawerItem>
          <DrawerItem name="Status">{condition.status}</DrawerItem>
          <DrawerItem name="Type">{condition.type}</DrawerItem>
          <DrawerItem name="Message" hidden={!condition.message}>
            {condition.message}
          </DrawerItem>
        </div>
      ))}
    </div>
  );
});

export const KubeObjectConditions = withInjectables<Dependencies, KubeObjectConditionsProps>(
  NonInjectedKubeObjectConditions,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
