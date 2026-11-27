/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pods.scss";

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { withInjectables } from "@ogre-tools/injectable-react";
import { computed } from "mobx";
import { observer } from "mobx-react";
import { useEffect, useMemo } from "react";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NodeSelectFilter } from "./node-select-filter";
import nodeUrlPageParamInjectable from "./node-url-param.injectable";
import { getPodContainerPorts } from "./pod-ports-cell";
import podStoreInjectable from "./store.injectable";

import type { Pod } from "@freelensapp/kube-object";
import type { SpecificKubeListLayoutColumn } from "@freelensapp/list-layout";

import type { PageParam } from "../../navigation/page-param";
import type { EventStore } from "../events/store";
import type { KubeItemListStore } from "../kube-object-list-layout";
import type { PodStore } from "./store";

interface Dependencies {
  eventStore: EventStore;
  podStore: PodStore;
  nodeUrlParam: PageParam<string>;
  columns: SpecificKubeListLayoutColumn<Pod>[];
}

// The pods of the selected namespaces, narrowed to the node of ?node= the way
// the namespace selection narrows them: the header counts only these pods.
const podsOnNode = (podStore: PodStore, nodeUrlParam: PageParam<string>): KubeItemListStore<Pod> => {
  const contextItems = computed(() => {
    const nodeName = nodeUrlParam.get();

    return nodeName ? podStore.contextItems.filter((pod) => pod.getNodeName() === nodeName) : podStore.contextItems;
  });

  return {
    api: podStore.api,
    get isLoaded() {
      return podStore.isLoaded;
    },
    get failedLoading() {
      return podStore.failedLoading;
    },
    get contextItems() {
      return contextItems.get();
    },
    getTotalCount: () => contextItems.get().length,
    getByPath: (path) => podStore.getByPath(path),
    isSelected: (pod) => podStore.isSelected(pod),
    toggleSelection: (pod) => podStore.toggleSelection(pod),
    isSelectedAll: (pods) => podStore.isSelectedAll(pods),
    toggleSelectionAll: (pods) => podStore.toggleSelectionAll(pods),
    pickOnlySelected: (pods) => podStore.pickOnlySelected(pods),
    removeSelectedItems: () => podStore.removeSelectedItems(),
    loadAll: (opts) => podStore.loadAll(opts),
    subscribe: (opts) => podStore.subscribe(opts),
  };
};

const NonInjectedPods = observer((props: Dependencies) => {
  const { columns, eventStore, podStore, nodeUrlParam } = props;
  const store = useMemo(() => podsOnNode(podStore, nodeUrlParam), [podStore, nodeUrlParam]);

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
        store={store}
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
        customizeHeader={({ filters, ...headerPlaceholders }) => ({
          filters: (
            <>
              {filters}
              <NodeSelectFilter />
            </>
          ),
          ...headerPlaceholders,
        })}
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
    nodeUrlParam: di.inject(nodeUrlPageParamInjectable),
    columns: di.injectMany(podListLayoutColumnInjectionToken),
  }),
});
