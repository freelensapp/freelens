/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import startCase from "lodash/startCase";
import React from "react";
import { StatusBrick } from "../../status-brick";
import { containerStatusClassName } from "../container-status-class-name";
import { COLUMN_PRIORITY } from "./column-priority";

import type {
  ContainerState,
  ContainerWithType,
  EphemeralContainerWithType,
  Pod,
  PodContainerStatus,
} from "@freelensapp/kube-object";

const renderState = (
  container: ContainerWithType | EphemeralContainerWithType,
  key: keyof ContainerState,
  status?: PodContainerStatus,
) => {
  const state = status?.state;
  if (!state) return;
  return (
    <>
      <div className="title">
        {container.name}{" "}
        <span className="text-secondary">
          {key}
          {container.type === "initContainers" ? ", init" : ""}
          {container.type === "ephemeralContainers" ? ", ephemeral" : ""}
          {status?.restartCount > 0 ? ", restarted" : ""}
          {status?.ready ? ", ready" : ""}
        </span>
      </div>
      {Object.entries(state[key] ?? {}).map(([name, value]) => (
        <React.Fragment key={name}>
          <div className="name">{startCase(name)}</div>
          <div className="value">{value}</div>
        </React.Fragment>
      ))}
    </>
  );
};

const renderContainersStatus = (pod: Pod) => {
  const statuses = pod.getContainerStatuses();
  return (
    <>
      {pod.getAllContainersWithType().map((container) => {
        const status = statuses.find((status) => status.name === container.name);
        return (
          <StatusBrick
            key={container.name}
            className={containerStatusClassName(container, status)}
            tooltip={{
              formatters: {
                tableView: true,
                nowrap: true,
              },
              children: (
                <>
                  {renderState(container, "running", status)}
                  {renderState(container, "waiting", status)}
                  {renderState(container, "terminated", status)}
                </>
              ),
            }}
          />
        );
      })}
    </>
  );
};

const columnId = "containers";

export const podsContainersColumnInjectable = getInjectable({
  id: "pods-containers-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.CONTAINERS,
    content: renderContainersStatus,
    header: {
      title: "Containers",
      className: "containers",
      sortBy: columnId,
      id: columnId,
    },
    sortingCallBack: (pod) => pod.getContainerStatuses().length,
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
