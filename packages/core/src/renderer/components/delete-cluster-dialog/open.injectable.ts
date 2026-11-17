/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { isCurrentContext } from "./is-current-context";
import deleteClusterDialogStateInjectable from "./state.injectable";

import type { Cluster } from "../../../common/cluster/cluster";
import type { KubeConfigData } from "../../../common/kube-config";

export type OpenDeleteClusterDialog = (config: KubeConfigData, cluster: Cluster) => void;

const openDeleteClusterDialogInjectable = getInjectable({
  id: "open-delete-cluster-dialog",
  instantiate: (di): OpenDeleteClusterDialog => {
    const state = di.inject(deleteClusterDialogStateInjectable);

    return (config, cluster) =>
      state.set({
        cluster,
        config,
        newCurrentContext: "",
        showContextSwitch: isCurrentContext(config, cluster),
      });
  },
});

export default openDeleteClusterDialogInjectable;
