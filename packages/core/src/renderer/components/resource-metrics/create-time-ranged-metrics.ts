/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "../../../common/utils/async-computed";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { DiContainer, DiContainerForInjection, Injectable } from "@ogre-tools/injectable";

import type { IAsyncComputed } from "../../../common/utils/async-computed";

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

type TimeRangedMetricsInjectable<Params, Value> = Injectable<IAsyncComputed<Value>, IAsyncComputed<Value>, Params>;

const getTimeRangedMetricsInjectable = getInjectable as <Params, Value>(options: {
  id: string;
  instantiate: (di: DiContainerForInjection, params: Params) => IAsyncComputed<Value>;
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

      return asyncComputed<Value>({
        getValueFromObservedPromise: async () => {
          const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

          return request({
            di,
            object,
            start,
            end,
            range,
          });
        },
        betweenUpdates: "show-latest-value",
      });
    },
    lifecycle: lifecycleEnum.keyedSingleton({
      getInstanceKey: (_di, params) => getObjectId(getObject(params)),
    }),
  });
