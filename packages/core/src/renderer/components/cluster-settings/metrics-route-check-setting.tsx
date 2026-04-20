/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import React from "react";
import { Checkbox } from "../checkbox";
import { SubTitle } from "../layout/sub-title";

import type { Cluster } from "../../../common/cluster/cluster";

export interface MetricsRouteCheckSettingProps {
  cluster: Cluster;
}

export const MetricsRouteCheckSetting = observer(function MetricsRouteCheckSetting({
  cluster,
}: MetricsRouteCheckSettingProps) {
  return (
    <>
      <SubTitle title="Performance" />
      <Checkbox
        label="Skip metrics endpoint check"
        value={cluster.preferences.skipMetricsRouteCheck ?? false}
        onChange={(checked) => {
          cluster.preferences.skipMetricsRouteCheck = checked;
        }}
      />
      <small className="hint">
        Skip Prometheus metrics endpoint detection when connecting to this cluster.
        Speeds up connection on clusters without Prometheus.
      </small>
    </>
  );
});
