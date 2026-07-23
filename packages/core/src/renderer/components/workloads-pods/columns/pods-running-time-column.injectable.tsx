/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import moment from "moment-timezone";
import { ReactiveDuration } from "../../duration/reactive-duration";
import { WithTooltip } from "../../with-tooltip";
import { COLUMN_PRIORITY } from "./column-priority";

const columnId = "running-time";

export const podsRunningTimeColumnInjectable = getInjectable({
  id: "pods-running-time-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.RUNNING_TIME ?? 8,
    content: (pod) => {
      if (pod.status?.phase !== "Running") {
        return <>-</>;
      }
      const containerStatuses = pod.getContainerStatuses();
      const runningStartedAts = containerStatuses
        .map((c) => c.state?.running?.startedAt)
        .filter((t): t is string => !!t);

      if (runningStartedAts.length === 0) {
        return <>-</>;
      }
      const times = runningStartedAts.map((t) => new Date(t).getTime());
      const minTime = Math.min(...times);
      const startTime = new Date(minTime).toISOString();

      return (
        <WithTooltip tooltip={moment(startTime).toDate()}>
          <ReactiveDuration key="running-time" timestamp={startTime} compact={true} />
        </WithTooltip>
      );
    },
    header: { title: "Running Time", className: "running-time", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => {
      if (pod.status?.phase !== "Running") {
        return 0;
      }
      const containerStatuses = pod.getContainerStatuses();
      const runningStartedAts = containerStatuses
        .map((c) => c.state?.running?.startedAt)
        .filter((t): t is string => !!t);

      if (runningStartedAts.length === 0) {
        return 0;
      }
      const times = runningStartedAts.map((t) => new Date(t).getTime());
      return -Math.min(...times);
    },
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
