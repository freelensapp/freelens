/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeConfig } from "@freelensapp/kubernetes-client-node";
import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";
import type { Cluster } from "../../../common/cluster/cluster";

export interface DeleteClusterDialogState {
  config: KubeConfig;
  cluster: Cluster;
  showContextSwitch: boolean;
  newCurrentContext: string;
}

const deleteClusterDialogStateInjectable = getInjectable({
  id: "delete-cluster-dialog-state",
  instantiate: () => observable.box<DeleteClusterDialogState | undefined>(),
});

export default deleteClusterDialogStateInjectable;
