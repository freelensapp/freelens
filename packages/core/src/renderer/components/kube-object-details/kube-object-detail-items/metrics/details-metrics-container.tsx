/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";
import type { KubeObjectDetailMetrics } from "@freelensapp/metrics";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";

export interface DetailsMetricsContainerProps<K extends KubeObject> {
  metrics: IComputedValue<KubeObjectDetailMetrics<K>[]>;
  object?: K;
}

function NonObservingDetailsMetricsContainer<K extends KubeObject>({
  metrics,
  object,
}: DetailsMetricsContainerProps<K>) {
  if (!object) {
    return null;
  }

  return (
    <>
      {metrics.get().map((metrics) => (
        <metrics.Component object={object} key={metrics.id} />
      ))}
    </>
  );
}

export const DetailsMetricsContainer = observer(NonObservingDetailsMetricsContainer);
