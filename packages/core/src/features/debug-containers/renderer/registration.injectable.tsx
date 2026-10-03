/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Pod } from "@freelensapp/kube-object";
import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { kubeObjectMenuItemInjectionToken } from "../../../renderer/components/kube-object-menu/kube-object-menu-item-injection-token";
import { MenuItem } from "../../../renderer/components/menu";
import { debugUnavailableReason } from "../common/debug-container";
import { DebugContainerDialog } from "./dialog";
import debugContainerDialogStateInjectable from "./dialog-state.injectable";

import type { KubeObject } from "@freelensapp/kube-object";

import type { KubeObjectMenuProps } from "../../../renderer/components/kube-object-menu/kube-object-menu";

export const debugContainerMenuInjectable = getInjectable({
  id: "debug-container-menu",
  instantiate: (di) => {
    const state = di.inject(debugContainerDialogStateInjectable);

    return {
      kind: "Pod",
      apiVersions: ["v1"],
      enabled: computed(() => true),
      orderNumber: 2.5,
      Component: ({ object, toolbar }: KubeObjectMenuProps<KubeObject>) => {
        if (!(object instanceof Pod)) return null;
        const pod = object;
        const reason = debugUnavailableReason(pod);

        return (
          <MenuItem disabled={Boolean(reason)} onClick={() => state.open(pod)}>
            <Icon material="bug_report" interactive={toolbar} tooltip={reason || "Debug pod"} />
            <span>Debug...</span>
          </MenuItem>
        );
      },
    };
  },
  injectionToken: kubeObjectMenuItemInjectionToken,
});

export const debugContainerDialogRegistrationInjectable = getInjectable({
  id: "debug-container-dialog-registration",
  instantiate: () => ({
    id: "debug-container-dialog",
    shouldRender: computed(() => true),
    Component: DebugContainerDialog,
  }),
  injectionToken: clusterFrameChildComponentInjectionToken,
});
