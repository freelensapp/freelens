/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { nodeApiInjectable } from "@freelensapp/kube-api-specifics";
import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { stopPropagation } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../badge";
import getDetailsUrlInjectable from "../../kube-detail-params/get-details-url.injectable";
import { COLUMN_PRIORITY } from "./column-priority";

export const podsNodeColumnInjectable = getInjectable({
  id: "pods-node-column",
  instantiate: (di) => {
    const getDetailsUrl = di.inject(getDetailsUrlInjectable);
    const nodeApi = di.inject(nodeApiInjectable);
    const columnId = "node";

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: COLUMN_PRIORITY.NODE,
      content: (pod) =>
        pod.getNodeName() ? (
          <Badge flat key="node" className="node" tooltip={pod.getNodeName()} expandable={false}>
            <Link
              to={getDetailsUrl(nodeApi.formatUrlForNotListing({ name: pod.getNodeName() }))}
              onClick={stopPropagation}
            >
              {pod.getNodeName()}
            </Link>
          </Badge>
        ) : (
          ""
        ),
      header: { title: "Node", className: "node", sortBy: columnId, id: columnId },
      sortingCallBack: (pod) => pod.getNodeName(),
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
