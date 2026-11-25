/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pods.scss";

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { getPodContainerPorts } from "./pod-ports-cell";
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

const NonInjectedPods = observer((props: Dependencies) => {
  const { columns, eventStore, podStore } = props;

  // The next load is scheduled when the previous one has ended, after the time
  // the store asks for, which grows with the number of requests a load sends.
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;

    const load = async () => {
      await podStore.loadKubeMetrics();

      if (!stopped) {
        timer = window.setTimeout(load, podStore.kubeMetricsRefreshSeconds * 1000);
      }
    };

    void load();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
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
        searchFilters={[
          (pod) => pod.getSearchFields(),
          (pod) => pod.getStatusMessage(),
          (pod) => pod.status?.podIP,
          (pod) => pod.getNodeName(),
          (pod) => getPodContainerPorts(pod).flatMap((port) => [port.name, port.containerPort, port.protocol]),
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
