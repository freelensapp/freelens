/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import startCase from "lodash/startCase";
import React from "react";
import { StatusBrick } from "../../status-brick";
import { containerStatusClassName } from "../container-status-class-name";
import { COLUMN_PRIORITY } from "./column-priority";

import type {
  ContainerStateRunning,
  ContainerStateTerminated,
  ContainerStateWaiting,
  ContainerWithType,
  EphemeralContainerWithType,
  Pod,
  PodContainerStatus,
} from "@freelensapp/kube-object";

const renderState = (container: ContainerWithType | EphemeralContainerWithType, status?: PodContainerStatus) => {
  const state = status ? Object.keys(status?.state ?? {})[0] : "";
  const terminated = status?.state ? (status?.state.terminated ?? "") : "";

  if (!state) return;
  const statusState = status?.state ?? {};
  let stateDetails: ContainerStateRunning | ContainerStateWaiting | ContainerStateTerminated | undefined;
  if (state === "running" || state === "waiting" || state === "terminated") {
    stateDetails = statusState[state];
  }

  return (
    <>
      <div className="title">
        {container.name}{" "}
        <span className="text-secondary">
          {state}
          {container.type === "initContainers" ? ", init" : ""}
          {container.type === "ephemeralContainers" ? ", ephemeral" : ""}
          {status?.restartCount ? ", restarted" : ""}
          {status?.ready ? ", ready" : ""}
          {terminated ? ` - ${terminated.reason} (exit code: ${terminated.exitCode})` : ""}
        </span>
      </div>
      {stateDetails && (
        <>
          {state === "running" &&
            object.entries(stateDetails as ContainerStateRunning).map(([name, value]) => (
              <React.Fragment key={name}>
                <div className="name">{startCase(name)}</div>
                <div className="value">{value}</div>
              </React.Fragment>
            ))}
          {state === "waiting" &&
            object.entries(stateDetails as ContainerStateWaiting).map(([name, value]) => (
              <React.Fragment key={name}>
                <div className="name">{startCase(name)}</div>
                <div className="value">{value}</div>
              </React.Fragment>
            ))}
          {state === "terminated" &&
            object.entries(stateDetails as ContainerStateTerminated).map(([name, value]) => (
              <React.Fragment key={name}>
                <div className="name">{startCase(name)}</div>
                <div className="value">{value ?? ""}</div>
              </React.Fragment>
            ))}
        </>
      )}
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
              children: renderState(container, status),
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
