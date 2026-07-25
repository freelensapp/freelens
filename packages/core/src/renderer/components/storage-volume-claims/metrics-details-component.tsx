/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import persistentVolumeClaimMetricsInjectable from "./metrics.injectable";
import { VolumeClaimDiskChart } from "./volume-claim-disk-chart";

import type { PersistentVolumeClaim } from "@freelensapp/kube-object";

import type { PersistentVolumeClaimMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-persistent-volume-claim-metrics.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<PersistentVolumeClaimMetricData>;
}

const NonInjectedPersistentVolumeClaimMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<PersistentVolumeClaim> & Dependencies) => (
    <TimeRangedResourceMetrics tabs={["Disk"]} object={object} metrics={metrics}>
      <VolumeClaimDiskChart />
    </TimeRangedResourceMetrics>
  ),
);

export const PersistentVolumeClaimMetricsDetailsComponent = withInjectables<
  Dependencies,
  KubeObjectDetailsProps<PersistentVolumeClaim>
>(NonInjectedPersistentVolumeClaimMetricsDetailsComponent, {
  getProps: (di, props) => ({
    metrics: di.inject(persistentVolumeClaimMetricsInjectable, {
      persistentVolumeClaim: props.object,
    }),
    ...props,
  }),
});
