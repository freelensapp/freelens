/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ReplicaSet } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import replicaSetScaleDialogStateInjectable from "./state.injectable";

export type OpenReplicaSetScaleDialog = (obj: ReplicaSet) => void;

const openReplicaSetScaleDialogInjectable = getInjectable({
  id: "open-replica-set-scale-dialog",
  instantiate: (di): OpenReplicaSetScaleDialog => {
    const state = di.inject(replicaSetScaleDialogStateInjectable);

    return (obj) => state.set(obj);
  },
});

export default openReplicaSetScaleDialogInjectable;
