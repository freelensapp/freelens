/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { StatefulSet } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import openStatefulSetScaleDialogInjectable from "../../components/workloads-statefulsets/scale/open-dialog.injectable";
import { staticKubeObjectHandlerInjectionToken } from "../handler";

const statefulSetKubeObjectHandlerInjectable = getInjectable({
  id: "stateful-set-kube-object-handler",
  instantiate: (di) => {
    const openStatefulSetScaleDialog = di.inject(openStatefulSetScaleDialogInjectable);

    return {
      kind: "StatefulSet",
      apiVersions: ["apps/v1"],
      onContextMenuOpen: (ctx) => {
        ctx.menuItems.push({
          icon: "open_with",
          title: "Scale",
          onClick: (obj) => openStatefulSetScaleDialog(obj as StatefulSet),
        });
      },
    };
  },
  injectionToken: staticKubeObjectHandlerInjectionToken,
});

export default statefulSetKubeObjectHandlerInjectable;
