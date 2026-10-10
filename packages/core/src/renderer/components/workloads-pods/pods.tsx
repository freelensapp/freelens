/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pods.scss";

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { interval } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import podStoreInjectable from "./store.injectable";

import type { Pod } from "@freelensapp/kube-object";
import type { SpecificKubeListLayoutColumn } from "@freelensapp/list-layout";

import type { EventStore } from "../events/store";
import type { PodStore } from "./store";

interface Dependencies {
  eventStore: EventStore;
  podStore: PodStore;
  columns: SpecificKubeListLayoutColumn<Pod>[];
}

const REFRESH_METRICS_INTERVAL = 10;

const NonInjectedPods = observer((props: Dependencies) => {
  const { columns, eventStore, podStore } = props;

  useEffect(() => {
    const fetchPodsMetricsInterval = interval(REFRESH_METRICS_INTERVAL, () => podStore.loadKubeMetrics());

    fetchPodsMetricsInterval.start(true);

    return () => fetchPodsMetricsInterval.stop();
  }, [podStore]);

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        className="Pods"
        store={podStore}
        dependentStores={[eventStore]} // status icon component uses event store
        tableId="workloads_pods"
        isConfigurable
        defaultHiddenTableColumns={["ip", "node", "qos"]}
        searchFields={[
          { id: "name", title: "Name", getValue: (pod) => pod.getName() },
          { id: "namespace", title: "Namespace", getValue: (pod) => pod.getNs() },
          { id: "labels", title: "Labels", getValue: (pod) => pod.getLabels() },
          { id: "status", title: "Status", getValue: (pod) => pod.getStatusMessage() },
          { id: "ip", title: "IP", getValue: (pod) => pod.status?.podIP },
          { id: "node", title: "Node", getValue: (pod) => pod.getNodeName() },
          { id: "uid", title: "UID", hidden: true, getValue: (pod) => pod.getId() },
        ]}
        renderHeaderTitle="Pods"
        renderTableHeader={[]}
        renderTableContents={() => []}
        columns={columns}
      />
    </SiblingsInTabLayout>
  );
});

export const Pods = withInjectables<Dependencies>(NonInjectedPods, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
    podStore: di.inject(podStoreInjectable),
    columns: di.injectMany(podListLayoutColumnInjectionToken),
  }),
});
