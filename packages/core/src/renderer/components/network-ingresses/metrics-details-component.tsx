/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import { IngressCharts } from "./ingress-charts";
import ingressMetricsInjectable from "./metrics.injectable";

import type { Ingress } from "@freelensapp/kube-object";

import type { IngressMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-ingress-metrics.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<IngressMetricData>;
}

const NonInjectedIngressMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<Ingress> & Dependencies) => (
    <TimeRangedResourceMetrics tabs={["Network", "Duration"]} object={object} metrics={metrics}>
      <IngressCharts />
    </TimeRangedResourceMetrics>
  ),
);

export const IngressMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Ingress>>(
  NonInjectedIngressMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(ingressMetricsInjectable, {
        ingress: props.object,
      }),
      ...props,
    }),
  },
);
