/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import requestClusterApiUrlInjectable from "../../../features/cluster/connections/renderer/request-api-url.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import nodeStoreInjectable from "../nodes/store.injectable";
import styles from "./cluster-info-strip.module.scss";
import { describeKubeletSkew, hasKubeletSkew, summarizeNodes } from "./cluster-info-summary";

import type { Cluster } from "../../../common/cluster/cluster";
import type { RequestClusterApiUrl } from "../../../features/cluster/connections/renderer/request-api-url.injectable";
import type { NodeStore } from "../nodes/store";
import type { ValueCount } from "./cluster-info-summary";

interface Dependencies {
  hostedCluster: Cluster | undefined;
  nodeStore: NodeStore;
  requestClusterApiUrl: RequestClusterApiUrl;
}

const unknown = "unknown";

/**
 * The values with the number of nodes of each when they differ, so `v1.31.2 (2), v1.30.4 (1)`.
 */
const formatDistinct = (values: ValueCount[]) => {
  if (values.length === 0) {
    return unknown;
  }

  if (values.length === 1) {
    return values[0].value;
  }

  return values.map(({ value, count }) => `${value} (${count})`).join(", ");
};

interface FactProps {
  label: string;
  value: string;
  testId: string;
  warnings?: string[];
}

const Fact = ({ label, value, testId, warnings = [] }: FactProps) => {
  const warning = warnings.join(" ");

  return (
    <div className={styles.fact} data-testid={testId}>
      <dt className={styles.label}>{label}</dt>
      <dd className={cssNames(styles.value, { [styles.warning]: warnings.length > 0 })} title={value}>
        {warnings.length > 0 && (
          <Icon
            material="warning"
            small
            className={styles.warningIcon}
            tooltip={warning}
            aria-label={warning}
            data-testid={`${testId}-warning`}
          />
        )}
        <span className={styles.text}>{value}</span>
      </dd>
    </div>
  );
};

const useApiUrl = (cluster: Cluster | undefined, requestClusterApiUrl: RequestClusterApiUrl) => {
  const [apiUrl, setApiUrl] = useState<{ clusterId: string; url: string | undefined }>();
  const clusterId = cluster?.id;

  useEffect(() => {
    if (!clusterId) {
      return undefined;
    }

    let current = true;

    requestClusterApiUrl(clusterId)
      .catch(() => undefined)
      .then((url) => {
        if (current) {
          setApiUrl({ clusterId, url });
        }
      });

    return () => {
      current = false;
    };
  }, [clusterId, requestClusterApiUrl]);

  if (!clusterId) {
    return unknown;
  }

  if (apiUrl?.clusterId !== clusterId) {
    return "…";
  }

  return apiUrl.url ?? unknown;
};

const NonInjectedClusterInfoStrip = observer(({ hostedCluster, nodeStore, requestClusterApiUrl }: Dependencies) => {
  const apiUrl = useApiUrl(hostedCluster, requestClusterApiUrl);
  const version = hostedCluster?.version.get() ?? unknown;
  const nodes = summarizeNodes(nodeStore.items, version);
  const skewWarnings = hasKubeletSkew(nodes.skew) ? describeKubeletSkew(nodes.skew, version) : [];

  return (
    <section className={styles.ClusterInfoStrip} aria-label="Cluster information" data-testid="cluster-info-strip">
      <dl className={styles.facts}>
        <Fact label="Kubernetes" value={version} testId="cluster-info-version" />
        <Fact
          label="Distribution"
          value={hostedCluster?.distribution.get() ?? unknown}
          testId="cluster-info-distribution"
        />
        <Fact label="API server" value={apiUrl} testId="cluster-info-api-server" />
        <Fact label="Context" value={hostedCluster?.contextName.get() || unknown} testId="cluster-info-context" />
      </dl>
      <dl className={styles.facts}>
        <Fact label="Nodes ready" value={`${nodes.ready} / ${nodes.total}`} testId="cluster-info-nodes-ready" />
        <Fact
          label="Roles"
          value={`${nodes.controlPlane} control plane, ${nodes.workers} ${nodes.workers === 1 ? "worker" : "workers"}`}
          testId="cluster-info-roles"
        />
        <Fact
          label="Kubelet"
          value={formatDistinct(nodes.kubeletVersions)}
          testId="cluster-info-kubelet"
          warnings={skewWarnings}
        />
        <Fact label="OS" value={formatDistinct(nodes.osImages)} testId="cluster-info-os" />
        <Fact label="Platform" value={formatDistinct(nodes.platforms)} testId="cluster-info-platform" />
        <Fact label="Runtime" value={formatDistinct(nodes.containerRuntimes)} testId="cluster-info-runtime" />
      </dl>
    </section>
  );
});

export const ClusterInfoStrip = withInjectables<Dependencies>(NonInjectedClusterInfoStrip, {
  getProps: (di) => ({
    hostedCluster: di.inject(hostedClusterInjectable),
    nodeStore: di.inject(nodeStoreInjectable),
    requestClusterApiUrl: di.inject(requestClusterApiUrlInjectable),
  }),
});
