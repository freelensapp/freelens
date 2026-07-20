/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./cluster-view.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import navigateToCatalogInjectable from "../../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import requestClusterActivationInjectable from "../../../features/cluster/activation/renderer/request-activation.injectable";
import getClusterByIdInjectable from "../../../features/cluster/storage/common/get-by-id.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import clusterFrameHandlerInjectable from "./cluster-frame-handler.injectable";
import { ClusterStatus } from "./cluster-status";
import clusterViewRouteParametersInjectable from "./cluster-view-route-parameters.injectable";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { Cluster } from "../../../common/cluster/cluster";
import type { NavigateToCatalog } from "../../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import type { RequestClusterActivation } from "../../../features/cluster/activation/common/request-token";
import type { GetClusterById } from "../../../features/cluster/storage/common/get-by-id.injectable";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import type { ClusterFrameHandler } from "./cluster-frame-handler";

interface Dependencies {
  clusterId: IComputedValue<string>;
  clusterFrames: ClusterFrameHandler;
  navigateToCatalog: NavigateToCatalog;
  entityRegistry: CatalogEntityRegistry;
  getClusterById: GetClusterById;
  requestClusterActivation: RequestClusterActivation;
}

@observer
class NonInjectedClusterView extends React.Component<Dependencies> {
  constructor(props: Dependencies) {
    super(props);
  }

  get clusterId() {
    return this.props.clusterId.get();
  }

  // Plain getter (not @computed): reads this.props, which mobx-react 9 forbids
  // inside a derivation. Read from render, reactivity is preserved by the
  // observer render reaction.
  get cluster(): Cluster | undefined {
    return this.props.getClusterById(this.clusterId);
  }

  // Plain getter (not @computed): reads this.props, which mobx-react 9 forbids
  // inside a derivation. Read from render, reactivity is preserved by the
  // observer render reaction.
  get isReady(): boolean {
    const { cluster } = this;

    if (!cluster) {
      return false;
    }

    return cluster.ready.get() && cluster.available.get() && this.props.clusterFrames.hasLoadedView(this.clusterId);
  }

  componentDidMount() {
    this.bindEvents();
  }

  componentWillUnmount() {
    this.props.clusterFrames.clearVisibleCluster();
    this.props.entityRegistry.activeEntity = undefined;
  }

  bindEvents() {
    // Capture props before the reaction: mobx-react 9 forbids reading this.props
    // inside a derivation. The reaction's data function reads the captured
    // clusterId observable directly instead of this.props.
    const { clusterId, clusterFrames, entityRegistry, navigateToCatalog, requestClusterActivation } = this.props;

    disposeOnUnmount(this, [
      reaction(
        () => clusterId.get(),
        async (id) => {
          // TODO: replace with better handling
          if (!id) {
            return;
          }

          if (!entityRegistry.getById(id)) {
            return navigateToCatalog(); // redirect to catalog when the clusterId does not correspond to an entity
          }

          clusterFrames.setVisibleCluster(id);
          clusterFrames.initView(id);
          requestClusterActivation({ clusterId: id });
          entityRegistry.activeEntity = id;
        },
        {
          fireImmediately: true,
        },
      ),
    ]);
  }

  renderStatus(): StrictReactNode {
    const { cluster, isReady } = this;

    if (cluster && !isReady) {
      return <ClusterStatus cluster={cluster} className="m-auto" />;
    }

    return null;
  }

  render() {
    return <div className="ClusterView flex flex-col items-center">{this.renderStatus()}</div>;
  }
}

export const ClusterView = withInjectables<Dependencies>(NonInjectedClusterView, {
  getProps: (di) => ({
    ...di.inject(clusterViewRouteParametersInjectable),
    navigateToCatalog: di.inject(navigateToCatalogInjectable),
    clusterFrames: di.inject(clusterFrameHandlerInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
    getClusterById: di.inject(getClusterByIdInjectable),
    requestClusterActivation: di.inject(requestClusterActivationInjectable),
  }),
});
