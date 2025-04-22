/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { StatefulSet } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

const statefulSetDialogStateInjectable = getInjectable({
  id: "stateful-set-dialog-state",
  instantiate: () => observable.box<StatefulSet | undefined>(),
});

export default statefulSetDialogStateInjectable;
