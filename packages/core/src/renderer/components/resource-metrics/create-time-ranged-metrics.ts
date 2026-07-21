/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { computed, observable, runInAction } from "mobx";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { classifyMetricsError } from "./classify-metrics-error";

import type { DiContainer, DiContainerForInjection, Injectable } from "@ogre-tools/injectable";
import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";

import type { MetricsErrorInfo } from "../../../common/k8s-api/endpoints/metrics.api";

interface RequestContext<ObjectType> {
  di: DiContainerForInjection;
  object: ObjectType;
  start: number;
  end: number;
  range: number;
}

interface TimeRangedMetricsInjectableConfig<Params, ObjectType, Value> {
  id: string;
  getObject: (params: Params) => ObjectType;
  getObjectId: (object: ObjectType) => string;
  request: (context: RequestContext<ObjectType>) => Promise<Value>;
}

export type TimeRangedMetricsValue<Value> = IAsyncComputed<Value> & {
  error: IComputedValue<MetricsErrorInfo | undefined>;
};

type TimeRangedMetricsInjectable<Params, Value> = Injectable<
  TimeRangedMetricsValue<Value>,
  TimeRangedMetricsValue<Value>,
  Params
>;

const getTimeRangedMetricsInjectable = getInjectable as <Params, Value>(options: {
  id: string;
  instantiate: (di: DiContainerForInjection, params: Params) => TimeRangedMetricsValue<Value>;
  lifecycle: {
    getInstanceKey: (di: DiContainer, params: Params) => string;
  };
}) => TimeRangedMetricsInjectable<Params, Value>;

export const createTimeRangedMetricsInjectable = <Params, ObjectType, Value>({
  id,
  getObject,
  getObjectId,
  request,
}: TimeRangedMetricsInjectableConfig<Params, ObjectType, Value>): TimeRangedMetricsInjectable<Params, Value> =>
  getTimeRangedMetricsInjectable<Params, Value>({
    id,
    instantiate: (di, params) => {
      const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);
      const object = getObject(params);
      const errorBox = observable.box<MetricsErrorInfo | undefined>(undefined, { deep: false });

      const metrics = asyncComputed<Value>({
        getValueFromObservedPromise: async () => {
          const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

          try {
            const value = await request({
              di,
              object,
              start,
              end,
              range,
            });

            runInAction(() => errorBox.set(undefined));

            return value;
          } catch (error) {
            // asyncComputed's internal promise chain only attaches a `.then()`,
            // with no rejection handler, so letting this promise reject would
            // leave `pending` stuck at `true` forever (a permanent spinner in
            // the chart). Always resolve and surface the failure via `error`.
            runInAction(() => errorBox.set(classifyMetricsError(error)));

            return undefined as Value;
          }
        },
        betweenUpdates: "show-latest-value",
      });

      return Object.assign(metrics, { error: computed(() => errorBox.get()) });
    },
    lifecycle: lifecycleEnum.keyedSingleton({
      getInstanceKey: (_di, params) => getObjectId(getObject(params)),
    }),
  });
