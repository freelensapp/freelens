/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { useContext } from "react";
import navigateToEntitySettingsInjectable from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import styles from "./no-metrics.module.scss";
import { ResourceMetricsContext } from "./resource-metrics";

import type { NavigateToEntitySettings } from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import type { MetricsErrorInfo } from "../../../common/k8s-api/endpoints/metrics.api";

const GENERIC_MESSAGE = "Metrics not available at the moment";

interface Dependencies {
  navigateToEntitySettings: NavigateToEntitySettings;
  clusterId: string | undefined;
}

function getReasonText(metricsError: MetricsErrorInfo): string {
  switch (metricsError.reason) {
    case "not-found":
      return "No Prometheus service was found for this cluster.";
    case "access-denied":
      return "Access to Prometheus metrics was denied.";
    case "error":
      return "Failed to load metrics.";
  }
}

function getDetailText(metricsError: MetricsErrorInfo): string {
  return metricsError.status !== undefined
    ? `HTTP ${metricsError.status}: ${metricsError.message}`
    : metricsError.message;
}

export function NonInjectedNoMetrics({ navigateToEntitySettings, clusterId }: Dependencies) {
  const metricsError = useContext(ResourceMetricsContext)?.metricsError;

  if (!metricsError) {
    // Unchanged from before error reasons existed: the most common empty
    // state across every chart, kept as a single row.
    return (
      <div className="flex justify-center items-center" data-testid="no-metrics-message">
        <Icon material="info" />
        &nbsp;{GENERIC_MESSAGE}
      </div>
    );
  }

  const canOpenClusterSettings =
    clusterId !== undefined && (metricsError.reason === "not-found" || metricsError.reason === "access-denied");

  return (
    <div
      className="flex flex-col justify-center items-center gap-1"
      title={getDetailText(metricsError)}
      data-testid="no-metrics-message"
    >
      <Icon material="info" />
      <p>{getReasonText(metricsError)}</p>
      {canOpenClusterSettings && (
        <span className={styles.link} onClick={() => navigateToEntitySettings(clusterId, "metrics")}>
          Open cluster settings
        </span>
      )}
    </div>
  );
}

export const NoMetrics = withInjectables<Dependencies>(NonInjectedNoMetrics, {
  getProps: (di) => {
    const cluster = di.inject(hostedClusterInjectable);

    return {
      navigateToEntitySettings: di.inject(navigateToEntitySettingsInjectable),
      clusterId: cluster?.id,
    };
  },
});
