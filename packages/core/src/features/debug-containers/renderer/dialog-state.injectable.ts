/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { v4 as uuid } from "uuid";
import { initialDebugContainerImage } from "../../../common/cluster-types";
import hostedClusterInjectable from "../../../renderer/cluster-frame-context/hosted-cluster.injectable";
import createTerminalTabInjectable from "../../../renderer/components/dock/terminal/create-terminal-tab.injectable";
import hideDetailsInjectable from "../../../renderer/components/kube-detail-params/hide-details.injectable";
import { DebugContainerDialogState } from "./dialog-state";

const debugContainerDialogStateInjectable = getInjectable({
  id: "debug-container-dialog-state",
  instantiate: (di) => {
    const createTerminalTab = di.inject(createTerminalTabInjectable);
    const hideDetails = di.inject(hideDetailsInjectable);
    const hostedCluster = di.inject(hostedClusterInjectable);

    return new DebugContainerDialogState({
      getDefaultImage: () => hostedCluster?.preferences.debugContainerImage || initialDebugContainerImage,
      randomId: () => uuid().replaceAll("-", "").slice(0, 8),
      openTerminal: (debugContainer) => {
        createTerminalTab({
          title: `Debug: ${debugContainer.pod} (namespace: ${debugContainer.namespace})`,
          debugContainer,
        });
        hideDetails();
      },
    });
  },
});

export default debugContainerDialogStateInjectable;
