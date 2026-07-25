/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { MetricsTimeRangeSelector } from "../cluster/metrics-time-range-selector";
import selectedMetricsTimeRangeInjectable, {
  type SelectedMetricsTimeRange,
} from "../cluster/overview/selected-metrics-time-range.injectable";
import { createMetricsTimeRangeKey } from "../cluster/overview/time-range-key";
import timeRangeStyles from "./metrics-time-range-container.module.css";
import { ResourceMetrics } from "./resource-metrics";

import type { ResourceMetricsProps } from "./resource-metrics";

interface Dependencies {
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

type TimeRangedResourceMetricsProps<Keys extends string> = ResourceMetricsProps<Keys>;

const NonInjectedTimeRangedResourceMetrics = observer(
  <Keys extends string>({
    selectedMetricsTimeRange,
    ...resourceMetricsProps
  }: TimeRangedResourceMetricsProps<Keys> & Dependencies) => {
    const timeRangeLabel = selectedMetricsTimeRange.displayLabel.get();
    const metricsKey = createMetricsTimeRangeKey(selectedMetricsTimeRange.value.get());

    return (
      <>
        <div className={`flex ${timeRangeStyles.timeRangeContainer}`} data-time-range={timeRangeLabel}>
          <MetricsTimeRangeSelector displayMode="expanded" />
        </div>
        <ResourceMetrics {...resourceMetricsProps} metricsKey={metricsKey} />
      </>
    );
  },
);

const InjectedTimeRangedResourceMetrics = withInjectables<Dependencies, TimeRangedResourceMetricsProps<string>>(
  NonInjectedTimeRangedResourceMetrics,
  {
    getProps: (di, props) => ({
      ...props,
      selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
    }),
  },
);

export const TimeRangedResourceMetrics = <Keys extends string>(props: TimeRangedResourceMetricsProps<Keys>) => (
  <InjectedTimeRangedResourceMetrics {...props} />
);
