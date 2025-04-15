/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./cluster-no-metrics.module.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import type { NavigateToEntitySettings } from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import navigateToEntitySettingsInjectable from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";

export interface ClusterNoMetricsProps {
  className: string;
}

interface Dependencies {
  navigateToEntitySettings: NavigateToEntitySettings;
  clusterId: string | undefined;
}

export function NonInjectedClusterNoMetrics({
  className,
  navigateToEntitySettings,
  clusterId,
}: Dependencies & ClusterNoMetricsProps) {
  function openMetricSettingsPage() {
    if (clusterId) {
      navigateToEntitySettings(clusterId, "metrics");
    }
  }

  return (
    <div className={cssNames(styles.ClusterNoMetrics, className)} data-testid="no-metrics-message">
      <Icon material="info" />
      <p>Metrics are not available due to missing or invalid Prometheus configuration.</p>
      <p>
        <span className={styles.link} onClick={openMetricSettingsPage}>
          Open cluster settings
        </span>
      </p>
    </div>
  );
}

export const ClusterNoMetrics = withInjectables<Dependencies, ClusterNoMetricsProps>(
  NonInjectedClusterNoMetrics,

  {
    getProps: (di, props) => {
      const cluster = di.inject(hostedClusterInjectable);

      return {
        navigateToEntitySettings: di.inject(navigateToEntitySettingsInjectable),
        clusterId: cluster?.id,
        ...props,
      };
    },
  },
);
