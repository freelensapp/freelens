/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPersistentVolumeClaimMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-persistent-volume-claim-metrics.injectable";

import type { PersistentVolumeClaim } from "@freelensapp/kube-object";

const persistentVolumeClaimMetricsInjectable = getInjectable({
  id: "persistent-volume-claim-metrics",
  instantiate: (di, persistentVolumeClaim) => {
    const requestPersistentVolumeClaimMetrics = di.inject(requestPersistentVolumeClaimMetricsInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000); // update every minute

        return requestPersistentVolumeClaimMetrics(persistentVolumeClaim);
      },
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, persistentVolumeClaim: PersistentVolumeClaim) => persistentVolumeClaim.getId(),
  }),
});

export default persistentVolumeClaimMetricsInjectable;
