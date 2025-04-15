/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Container, Pod } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import type { TabId } from "../dock/store";
import createLogsTabInjectable from "./create-logs-tab.injectable";

export interface PodLogsTabData {
  selectedPod: Pod;
  selectedContainer: Container;
}

const createPodLogsTabInjectable = getInjectable({
  id: "create-pod-logs-tab",

  instantiate: (di) => {
    const createLogsTab = di.inject(createLogsTabInjectable);

    return ({ selectedPod, selectedContainer }: PodLogsTabData): TabId =>
      createLogsTab(`Pod ${selectedPod.getName()}`, {
        owner: selectedPod.getOwnerRefs()[0],
        namespace: selectedPod.getNs(),
        selectedContainer: selectedContainer.name,
        selectedPodId: selectedPod.getId(),
      });
  },
});

export default createPodLogsTabInjectable;
