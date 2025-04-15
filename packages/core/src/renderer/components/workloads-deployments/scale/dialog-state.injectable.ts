/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Deployment } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

const deploymentScaleDialogStateInjectable = getInjectable({
  id: "deployment-scale-dialog-state",
  instantiate: () => observable.box<Deployment | undefined>(),
});

export default deploymentScaleDialogStateInjectable;
