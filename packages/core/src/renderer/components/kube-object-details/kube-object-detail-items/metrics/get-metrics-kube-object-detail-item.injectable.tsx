/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";
import type { KubeObjectDetailMetrics } from "@freelensapp/metrics";
import type { InjectionToken } from "@ogre-tools/injectable";
import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectable } from "@ogre-tools/injectable-extension-for-mobx";
import React from "react";
import type { ClusterMetricsResourceType } from "../../../../../common/cluster-types";
import metricsDetailsComponentEnabledInjectable from "../../../../api/catalog/entity/metrics-details-component-enabled.injectable";
import type { KubeObjectDetailsProps } from "../../kube-object-details";
import type { KubeObjectDetailItem } from "../kube-object-detail-item-injection-token";
import { DetailsMetricsContainer } from "./details-metrics-container";

export type GetMetricsKubeObjectDetailItem = <K extends KubeObject>(
  token: InjectionToken<KubeObjectDetailMetrics<K>, void>,
  metricResourceType: ClusterMetricsResourceType,
) => KubeObjectDetailItem;

export const getMetricsKubeObjectDetailItemInjectable = getInjectable({
  id: "get-metrics-kube-object-detail-item",
  instantiate: (di): GetMetricsKubeObjectDetailItem => {
    const computedInjectedMany = di.inject(computedInjectManyInjectable);

    return <K extends KubeObject>(
      token: InjectionToken<KubeObjectDetailMetrics<K>, void>,
      metricResourceType: ClusterMetricsResourceType,
    ) => {
      const metrics = computedInjectedMany(token);
      const Component = (props: KubeObjectDetailsProps<K>) => (
        <DetailsMetricsContainer<K> metrics={metrics} {...props} />
      );

      return {
        Component,
        enabled: di.inject(metricsDetailsComponentEnabledInjectable, metricResourceType),
        orderNumber: -1,
      };
    };
  },
});
