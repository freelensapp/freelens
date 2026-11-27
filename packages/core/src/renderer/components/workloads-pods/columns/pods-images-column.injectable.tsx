/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import { getPodContainerImages, PodImagesCell } from "../pod-images-cell";
import { COLUMN_PRIORITY } from "./column-priority";

const columnId = "images";

export const podsImagesColumnInjectable = getInjectable({
  id: "pods-images-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.IMAGES,
    content: (pod) => <PodImagesCell pod={pod} />,
    header: { title: "Images", className: "images", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => getPodContainerImages(pod).join(", "),
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
