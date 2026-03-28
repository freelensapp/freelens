/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { withTooltip } from "@freelensapp/tooltip";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import eventStoreInjectable from "../../events/store.injectable";
import { COLUMN_PRIORITY } from "./column-priority";

import type { KubeEvent, Pod } from "@freelensapp/kube-object";
import type { StrictReactNode } from "@freelensapp/utilities";

interface WarningIconProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: StrictReactNode;
}

const WarningIcon = withTooltip(({ ...elemProps }: WarningIconProps) => (
  <Icon material="warning_amber" className="warning" {...elemProps} />
));

interface WarningEventIndicatorProps {
  latestWarningEvent?: KubeEvent;
}

const getLatestWarningEvent = (events: KubeEvent[]): KubeEvent | undefined => {
  let latestWarningEvent: KubeEvent | undefined;
  let latestWarningTimestamp = Number.NEGATIVE_INFINITY;

  for (const event of events) {
    if (event.type !== "Warning") {
      continue;
    }

    const timestampMs = event.lastTimestamp ? Date.parse(event.lastTimestamp) : event.getCreationTimestamp();

    if (timestampMs > latestWarningTimestamp) {
      latestWarningTimestamp = timestampMs;
      latestWarningEvent = event;
    }
  }

  return latestWarningEvent;
};

const WarningEventIndicator: React.FC<WarningEventIndicatorProps> = ({ latestWarningEvent }) => {
  if (!latestWarningEvent) {
    return null;
  }

  return (
    <WarningIcon
      tooltip={{
        formatters: {
          tableView: true,
          nowrap: true,
        },
        children: <div>{latestWarningEvent.message}</div>,
      }}
    />
  );
};

const columnId = "podwarning";

export const podsWarningColumnInjectable = getInjectable({
  id: "pods-podwarning-column",
  instantiate: (di) => {
    const eventStore = di.inject(eventStoreInjectable);

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: COLUMN_PRIORITY.PODWARNING,
      content: (pod: Pod) => {
        if (!pod.hasIssues()) {
          return null;
        }

        const events = eventStore.getEventsByObject(pod);
        const latestWarningEvent = getLatestWarningEvent(events);

        return <WarningEventIndicator latestWarningEvent={latestWarningEvent} />;
      },
      header: {
        title: <Icon material="warning_amber" />,
        id: columnId,
      },
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
