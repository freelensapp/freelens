/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./resource-metrics.scss";

import { Spinner } from "@freelensapp/spinner";
import { cssNames } from "@freelensapp/utilities";
import { isComputed } from "mobx";
import { observer } from "mobx-react-lite";
import React, { createContext, useRef, useState } from "react";
import { Radio, RadioGroup } from "../radio";

import type { KubeObject } from "@freelensapp/kube-object";

import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { MetricsTab } from "../chart/options";

export type AtLeastOneMetricTab = [MetricsTab, ...MetricsTab[]];

export interface ResourceMetricsProps<Keys extends string> {
  tabs: AtLeastOneMetricTab;
  object: KubeObject;
  className?: string;
  metricsKey?: string;
  metrics: IAsyncComputed<Partial<Record<Keys, MetricData>> | null | undefined> | Partial<Record<Keys, MetricData>>;
  children: React.ReactNode | React.ReactNode[];
}

function isAsyncComputedMetrics<Keys extends string>(
  metrics: IAsyncComputed<Partial<Record<Keys, MetricData>> | null | undefined> | Partial<Record<Keys, MetricData>>,
): metrics is IAsyncComputed<Partial<Record<Keys, MetricData>> | null | undefined> {
  return isComputed((metrics as IAsyncComputed<unknown>).value);
}

export interface ResourceMetricsValue {
  object: KubeObject;
  tab: MetricsTab;
  metrics: Partial<Record<string, MetricData>> | null | undefined;
  isPending: boolean;
}

export const ResourceMetricsContext = createContext<ResourceMetricsValue | null>(null);

export const ResourceMetrics = observer(
  <Keys extends string>({ object, tabs, children, className, metrics, metricsKey }: ResourceMetricsProps<Keys>) => {
    const [tab, setTab] = useState<MetricsTab>(tabs[0]);
    const lastResolvedMetricsKeyRef = useRef<string | undefined>(undefined);
    const isAsyncMetrics = isAsyncComputedMetrics(metrics);
    const isPending = isAsyncMetrics ? metrics.pending.get() : false;
    const shouldHideStaleMetrics =
      isAsyncMetrics && isPending && metricsKey !== undefined && metricsKey !== lastResolvedMetricsKeyRef.current;

    if (!isPending) {
      lastResolvedMetricsKeyRef.current = metricsKey;
    }

    const currentMetrics = isAsyncMetrics ? (shouldHideStaleMetrics ? undefined : metrics.value.get()) : metrics;

    return (
      <div className={cssNames("ResourceMetrics flex flex-col", className)}>
        <div className="switchers flex gap-2">
          <RadioGroup asButtons className="flex gap-2 grow shrink-0 basis-0" value={tab} onChange={setTab}>
            {tabs.map((tab, index) => (
              <Radio key={index} className="grow shrink-0 basis-0" label={tab} value={tab} />
            ))}
          </RadioGroup>
        </div>
        <ResourceMetricsContext.Provider
          value={{
            object,
            tab,
            metrics: currentMetrics,
            isPending,
          }}
        >
          <div className="graph">{children}</div>
        </ResourceMetricsContext.Provider>
        <div className="loader">
          <Spinner />
        </div>
      </div>
    );
  },
);
