/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { withTooltip } from "@freelensapp/tooltip";
import type { KubeEvent, Pod } from "@freelensapp/kube-object";
import type { StrictReactNode } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";

import eventStoreInjectable from "../../events/store.injectable";
import type { EventStore } from "../../events/store";
import { COLUMN_PRIORITY } from "./column-priority";

interface WarningIconProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: StrictReactNode;
}

const WarningIcon = withTooltip(({ ...elemProps }: WarningIconProps) => (
  <Icon material="warning_amber" className="warning" {...elemProps} />
));

interface Dependencies {
  eventStore: EventStore;
}

interface PodwarningProps {
  pod: Pod;
}

const NonInjectablePodwarning: React.FC<PodwarningProps & Dependencies> = observer(({ pod, eventStore }) => {
  const events: KubeEvent[] = eventStore.getEventsByObject(pod);
  const latestWarningEvent: KubeEvent | undefined = events
    .filter((e) => e.type === "Warning")
    .sort((a, b) => {
      const ta = Date.parse(a.lastTimestamp ?? "");
      const tb = Date.parse(b.lastTimestamp ?? "");
      return tb - ta;
    })
    .at(0);

  if (!pod.hasIssues() || !latestWarningEvent) {
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
});

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
      title: <Icon material="warning_amber" />,
      className: "podwarning",
      id: columnId,
    },
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
