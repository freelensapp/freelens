/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview.scss";

import { Icon } from "@freelensapp/icon";
import { TooltipPosition } from "@freelensapp/tooltip";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { ClusterContext } from "../../cluster-frame-context/cluster-frame-context";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import type { EventStore } from "../events/store";
import eventStoreInjectable from "../events/store.injectable";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectFilter } from "../namespaces/namespace-select-filter";
import type { CronJobStore } from "../workloads-cronjobs/store";
import cronJobStoreInjectable from "../workloads-cronjobs/store.injectable";
import type { DaemonSetStore } from "../workloads-daemonsets/store";
import daemonSetStoreInjectable from "../workloads-daemonsets/store.injectable";
import type { DeploymentStore } from "../workloads-deployments/store";
import deploymentStoreInjectable from "../workloads-deployments/store.injectable";
import type { JobStore } from "../workloads-jobs/store";
import jobStoreInjectable from "../workloads-jobs/store.injectable";
import type { PodStore } from "../workloads-pods/store";
import podStoreInjectable from "../workloads-pods/store.injectable";
import type { ReplicaSetStore } from "../workloads-replicasets/store";
import replicaSetStoreInjectable from "../workloads-replicasets/store.injectable";
import type { StatefulSetStore } from "../workloads-statefulsets/store";
import statefulSetStoreInjectable from "../workloads-statefulsets/store.injectable";
import workloadOverviewDetailsInjectable from "./workload-overview-details/workload-overview-details.injectable";

interface Dependencies {
  detailComponents: IComputedValue<React.ElementType<{}>[]>;
  clusterFrameContext: ClusterContext;
  subscribeStores: SubscribeStores;
  podStore: PodStore;
  daemonSetStore: DaemonSetStore;
  replicaSetStore: ReplicaSetStore;
  deploymentStore: DeploymentStore;
  jobStore: JobStore;
  cronJobStore: CronJobStore;
  statefulSetStore: StatefulSetStore;
  eventStore: EventStore;
}

@observer
class NonInjectedWorkloadsOverview extends React.Component<Dependencies> {
  @observable loadErrors: string[] = [];

  constructor(props: Dependencies) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      this.props.subscribeStores(
        [
          this.props.cronJobStore,
          this.props.daemonSetStore,
          this.props.deploymentStore,
          this.props.eventStore,
          this.props.jobStore,
          this.props.podStore,
          this.props.replicaSetStore,
          this.props.statefulSetStore,
        ],
        {
          onLoadFailure: (error) => this.loadErrors.push(String(error)),
        },
      ),
      reaction(
        () => this.props.clusterFrameContext.contextNamespaces.slice(),
        () => {
          // clear load errors
          this.loadErrors.length = 0;
        },
      ),
    ]);
  }

  renderLoadErrors() {
    if (this.loadErrors.length === 0) {
      return null;
    }

    return (
      <Icon
        material="warning"
        className="load-error"
        tooltip={{
          children: (
            <>
              {this.loadErrors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </>
          ),
          preferredPositions: TooltipPosition.BOTTOM,
        }}
      />
    );
  }

  render() {
    return (
      <SiblingsInTabLayout scrollable>
        <div className="WorkloadsOverview flex column gaps" data-testid="page-for-workloads-overview">
          <div className="header flex gaps align-center">
            <h5 className="box grow">Overview</h5>
            {this.renderLoadErrors()}
            <NamespaceSelectFilter id="overview-namespace-select-filter-input" />
          </div>

          {this.props.detailComponents.get().map((Details, index) => (
            <Details key={`workload-overview-${index}`} />
          ))}
        </div>
      </SiblingsInTabLayout>
    );
  }
}

export const WorkloadsOverview = withInjectables<Dependencies>(NonInjectedWorkloadsOverview, {
  getProps: (di) => ({
    detailComponents: di.inject(workloadOverviewDetailsInjectable),
    clusterFrameContext: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
    subscribeStores: di.inject(subscribeStoresInjectable),
    daemonSetStore: di.inject(daemonSetStoreInjectable),
    podStore: di.inject(podStoreInjectable),
    replicaSetStore: di.inject(replicaSetStoreInjectable),
    cronJobStore: di.inject(cronJobStoreInjectable),
    deploymentStore: di.inject(deploymentStoreInjectable),
    jobStore: di.inject(jobStoreInjectable),
    statefulSetStore: di.inject(statefulSetStoreInjectable),
    eventStore: di.inject(eventStoreInjectable),
  }),
});
