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

import type { ContainerStateValues, ContainersType, Pod } from "@freelensapp/kube-object";

const renderState = (name: string, ready: boolean, type: ContainersType, key: string, data?: ContainerStateValues) =>
  data && (
    <>
      <div className="title">
        {name}{" "}
        <span className="text-secondary">
          {key}
          {type === "initContainers" ? ", init" : ""}
          {type === "ephemeralContainers" ? ", ephemeral" : ""}
          {ready ? ", ready" : ""}
        </span>
      </div>
      {Object.entries(data).map(([name, value]) => (
        <React.Fragment key={name}>
          <div className="name">{startCase(name)}</div>
          <div className="value">{value}</div>
        </React.Fragment>
      ))}
    </>
  );

const renderContainersStatus = (pod: Pod) => {
  const statuses = pod.getContainerStatuses();
  return (
    <>
      {pod.getAllContainersWithType().map((container) => {
        const { name, type } = container;
        const status = statuses.find((status) => status.name === container.name);
        const state = status?.state;
        const ready = status?.ready ?? false;
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
                  {renderState(name, ready, type, "running", state?.running)}
                  {renderState(name, ready, type, "waiting", state?.waiting)}
                  {renderState(name, ready, type, "terminated", state?.terminated)}
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
