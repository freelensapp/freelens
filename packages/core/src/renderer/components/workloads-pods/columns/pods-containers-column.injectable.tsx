/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ContainerStateValues, Pod } from "@freelensapp/kube-object";
import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { cssNames } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import startCase from "lodash/startCase";
import React from "react";
import { StatusBrick } from "../../status-brick";
import { COLUMN_PRIORITY } from "./column-priority";

const renderState = (name: string, ready: boolean, key: string, data?: ContainerStateValues) =>
  data && (
    <>
      <div className="title">
        {name}{" "}
        <span className="text-secondary">
          {key}
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

const renderContainersStatus = (pod: Pod) => (
  <>
    {pod.getContainerStatuses().map(({ name, state, ready }) => (
      <StatusBrick
        key={name}
        className={cssNames(state, { ready })}
        tooltip={{
          formatters: {
            tableView: true,
            nowrap: true,
          },
          children: (
            <>
              {renderState(name, ready, "running", state?.running)}
              {renderState(name, ready, "waiting", state?.waiting)}
              {renderState(name, ready, "terminated", state?.terminated)}
            </>
          ),
        }}
      />
    ))}
  </>
);

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
