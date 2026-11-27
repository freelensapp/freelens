/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { countBy } from "es-toolkit";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { shouldShowResourceInjectionToken } from "../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import nodeStoreInjectable from "../nodes/store.injectable";
import { Select } from "../select";
import styles from "./node-select-filter.module.scss";
import nodeUrlPageParamInjectable from "./node-url-param.injectable";
import podStoreInjectable from "./store.injectable";

import type { IComputedValue } from "mobx";
import type { FormatOptionLabelMeta } from "react-select";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { PageParam } from "../../navigation/page-param";
import type { NodeStore } from "../nodes/store";
import type { SelectOption } from "../select";
import type { PodStore } from "./store";

interface Dependencies {
  nodeStore: NodeStore;
  podStore: PodStore;
  nodeUrlParam: PageParam<string>;
  canListNodes: IComputedValue<boolean>;
  subscribeStores: SubscribeStores;
}

const allNodes: SelectOption<string> = { value: "", label: "All nodes" };

const NonInjectedNodeSelectFilter = observer(
  ({ nodeStore, podStore, nodeUrlParam, canListNodes, subscribeStores }: Dependencies) => {
    const nodesAreListable = canListNodes.get();

    useEffect(
      () => (nodesAreListable ? subscribeStores([nodeStore]) : undefined),
      [nodesAreListable, nodeStore, subscribeStores],
    );

    const selectedNode = nodeUrlParam.get();
    const nodeNames = new Set(nodesAreListable ? nodeStore.items.map((node) => node.getName()) : []);

    // A node that is not listed, or that cannot be listed, stays visible while
    // it is selected, so that the selection can be seen and cleared.
    if (selectedNode) {
      nodeNames.add(selectedNode);
    }

    if (nodeNames.size === 0 && !nodesAreListable) {
      return null;
    }

    const podCounts = countBy(podStore.contextItems, (pod) => pod.getNodeName() ?? "");
    const options = [
      allNodes,
      ...[...nodeNames]
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
        .map((name) => ({ value: name, label: name })),
    ];

    const formatOptionLabel = (
      { value, label }: SelectOption<string>,
      { context }: FormatOptionLabelMeta<SelectOption<string>>,
    ) => {
      if (!value) {
        return label;
      }

      if (context === "value") {
        return `Node: ${value}`;
      }

      return (
        <span className="flex justify-between gap-4">
          <span>{value}</span>
          <span className={styles.podCount}>{podCounts[value] ?? 0}</span>
        </span>
      );
    };

    return (
      <div className={styles.nodeSelectFilter} data-testid="pods-node-select-filter">
        <Select<string, SelectOption<string>, false>
          id="pods-node-select-filter-input"
          value={selectedNode}
          options={options}
          isDisabled={options.length === 1}
          formatOptionLabel={formatOptionLabel}
          onChange={(option) => (option?.value ? nodeUrlParam.set(option.value) : nodeUrlParam.clear())}
        />
      </div>
    );
  },
);

export const NodeSelectFilter = withInjectables<Dependencies>(NonInjectedNodeSelectFilter, {
  getProps: (di, props) => ({
    ...props,
    nodeStore: di.inject(nodeStoreInjectable),
    podStore: di.inject(podStoreInjectable),
    nodeUrlParam: di.inject(nodeUrlPageParamInjectable),
    canListNodes: di.inject(shouldShowResourceInjectionToken, { apiName: "nodes", group: "" }),
    subscribeStores: di.inject(subscribeStoresInjectable),
  }),
});
