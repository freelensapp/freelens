/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { COLUMN_PRIORITY } from "./column-priority";
import { Icon } from "@freelensapp/icon";
import type { EventStore } from "../../events/store";
import eventStoreInjectable from "../../events/store.injectable";

import type {
  KubeEvent,
  Pod,
} from "@freelensapp/kube-object";

interface Dependencies {
  eventStore: EventStore;
}

interface PodwarningProps {
  pod: Pod;
}

const NonInjectablePodwarning: React.FC<PodwarningProps & Dependencies> = ({ pod, eventStore }) => {
  const events: KubeEvent[] = eventStore.getEventsByObject(pod);
  const latestWarningEvent: KubeEvent | undefined =
    events
      .filter(e => e.type === "Warning")
      .sort((a, b) => {
        const ta = Date.parse(a.lastTimestamp ?? a.eventTime ?? "");
        const tb = Date.parse(b.lastTimestamp ?? b.eventTime ?? "");
        return tb - ta;
      })
      .at(0);

  if (!latestWarningEvent) {
    return null;
  }

  return (
    <Icon
      material="warning_amber"
      className="warning"
    />
  );
};

const Podwarning = withInjectables<Dependencies, PodwarningProps>(NonInjectablePodwarning, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
  }),
});

const columnId = "podwarning";

export const podsWarningColumnInjectable = getInjectable({
  id: "pods-podwarning-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.PODWARNING,
    content: (pod: Pod) => <Podwarning pod={pod} />,
    header: {
      title: <Icon
        material="warning_amber"
      />,
      className: "podwarning",
      sortBy: columnId,
      id: columnId,
    },
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
