/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pods.scss";

import type { Pod } from "@freelensapp/kube-object";
import type { SpecificKubeListLayoutColumn } from "@freelensapp/list-layout";
import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import type { EventStore } from "../events/store";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import type { PodStore } from "./store";
import podStoreInjectable from "./store.injectable";

interface Dependencies {
  eventStore: EventStore;
  podStore: PodStore;
  columns: SpecificKubeListLayoutColumn<Pod>[];
}

const NonInjectedPods = observer((props: Dependencies) => {
  const { columns, eventStore, podStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        className="Pods"
        store={podStore}
        dependentStores={[eventStore]} // status icon component uses event store
        tableId="workloads_pods"
        isConfigurable
        searchFilters={[
          (pod) => pod.getSearchFields(),
          (pod) => pod.getStatusMessage(),
          (pod) => pod.status?.podIP,
          (pod) => pod.getNodeName(),
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
