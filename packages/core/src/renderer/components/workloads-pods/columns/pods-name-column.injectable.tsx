/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getConvertedParts } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { WithTooltip } from "../../badge";
import { COLUMN_PRIORITY } from "./column-priority";

import type { Pod } from "@freelensapp/kube-object";

const columnId = "name";

export const podsNameColumnInjectable = getInjectable({
  id: "pods-name-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.NAME,
    content: (pod: Pod) => <WithTooltip>{pod.getName()}</WithTooltip>,
    header: { title: "Name", className: "name", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => getConvertedParts(pod.getName()),
    searchFilter: (pod) => pod.getSearchFields(),
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
