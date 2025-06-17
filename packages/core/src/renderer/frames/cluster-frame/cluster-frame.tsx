/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ErrorBoundary } from "@freelensapp/error-boundary";
import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { disposer } from "@freelensapp/utilities";
import { computedInjectManyInjectable } from "@ogre-tools/injectable-extension-for-mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import { Observer, observer } from "mobx-react";
import React, { useEffect } from "react";
import namespaceStoreInjectable from "../../components/namespaces/store.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import watchHistoryStateInjectable from "../../remote-helpers/watch-history-state.injectable";

import type { ClusterFrameChildComponent } from "@freelensapp/react-application";

import type { IComputedValue } from "mobx";

import type { NamespaceStore } from "../../components/namespaces/store";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";

interface Dependencies {
  namespaceStore: NamespaceStore;
  subscribeStores: SubscribeStores;
  childComponents: IComputedValue<ClusterFrameChildComponent[]>;
  watchHistoryState: () => () => void;
}

const NonInjectedClusterFrame = observer(
  ({ namespaceStore, subscribeStores, childComponents, watchHistoryState }: Dependencies) => {
    useEffect(() => disposer(subscribeStores([namespaceStore]), watchHistoryState()), []);

    return (
      <ErrorBoundary>
        {childComponents.get().map((child) => (
          <Observer key={child.id}>{() => (child.shouldRender.get() ? <child.Component /> : null)}</Observer>
        ))}
      </ErrorBoundary>
    );
  },
);

export const ClusterFrame = withInjectables<Dependencies>(NonInjectedClusterFrame, {
  getProps: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectable);

    return {
      namespaceStore: di.inject(namespaceStoreInjectable),
      subscribeStores: di.inject(subscribeStoresInjectable),
      childComponents: computedInjectMany(clusterFrameChildComponentInjectionToken),
      watchHistoryState: di.inject(watchHistoryStateInjectable),
    };
  },
});

ClusterFrame.displayName = "ClusterFrame";
