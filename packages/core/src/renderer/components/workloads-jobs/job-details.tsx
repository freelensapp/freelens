/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./job-details.scss";

import { Job } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { formatDuration } from "@freelensapp/utilities/dist";
import { withInjectables } from "@ogre-tools/injectable-react";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import { ReactiveDuration } from "../duration";
import { DurationAbsoluteTimestamp } from "../events";
import { KubeObjectConditionsDrawer } from "../kube-object-conditions";
import { PodDetailsAffinities } from "../workloads-pods/pod-details-affinities";
import { PodDetailsList } from "../workloads-pods/pod-details-list";
import { PodDetailsStatuses } from "../workloads-pods/pod-details-statuses";
import { PodDetailsTolerations } from "../workloads-pods/pod-details-tolerations";
import podStoreInjectable from "../workloads-pods/store.injectable";
import { getStatusClass, getStatusText } from "./jobs";
import jobStoreInjectable from "./store.injectable";

import type { Logger } from "@freelensapp/logger";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { PodStore } from "../workloads-pods/store";
import type { JobStore } from "./store";

export interface JobDetailsProps extends KubeObjectDetailsProps<Job> {}

interface Dependencies {
  subscribeStores: SubscribeStores;
  podStore: PodStore;
  jobStore: JobStore;
  logger: Logger;
}

@observer
class NonInjectedJobDetails extends React.Component<JobDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [this.props.subscribeStores([this.props.podStore])]);
  }

  render() {
    const { object: job, jobStore, logger } = this.props;

    if (!job) {
      return null;
    }

    if (!(job instanceof Job)) {
      logger.error("[JobDetails]: passed object that is not an instanceof Job", job);

      return null;
    }

    const selectors = job.getSelectors();
    const nodeSelector = job.getNodeSelectors();
    const childPods = jobStore.getChildPods(job);

    return (
      <div className="JobDetails">
        {selectors.length > 0 && (
          <DrawerItem name="Selector" labelsOnly>
            {selectors.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </DrawerItem>
        )}
        {nodeSelector.length > 0 && (
          <DrawerItem name="Node Selector">
            {nodeSelector.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </DrawerItem>
        )}
        <DrawerItem name="Status">
          <Badge className={getStatusClass(job)} label={getStatusText(job)} tooltip={getStatusText(job)} />
        </DrawerItem>
        <DrawerItem name="Parallelism">{job.getParallelism()}</DrawerItem>
        <DrawerItem name="Completions">{job.getDesiredCompletions()}</DrawerItem>
        <DrawerItem name="Completion Mode" hidden={!job.spec.completionMode}>
          {job.spec.completionMode}
        </DrawerItem>
        <DrawerItem name="Suspend">{job.getSuspendFlag()}</DrawerItem>
        <DrawerItem name="Backoff Limit" hidden={job.spec.backoffLimit !== undefined}>
          {job.spec.backoffLimit}
        </DrawerItem>
        <DrawerItem name="TTL Seconds After Finished" hidden={job.spec.ttlSecondsAfterFinished !== undefined}>
          {formatDuration(job.spec.ttlSecondsAfterFinished || 0)}
        </DrawerItem>
        <DrawerItem name="Start Time" hidden={!job.status?.startTime}>
          <DurationAbsoluteTimestamp timestamp={job.status?.startTime} />
        </DrawerItem>
        <DrawerItem name="Completed At" hidden={!job.status?.completionTime}>
          <DurationAbsoluteTimestamp timestamp={job.status?.completionTime} />
        </DrawerItem>
        <DrawerItem name="Duration" hidden={!job.status?.startTime || !job.status?.completionTime}>
          {formatDuration(job.getJobDuration())}
        </DrawerItem>
        <DrawerItem name="Active Deadline Seconds" hidden={!job.spec.activeDeadlineSeconds}>
          {formatDuration(job.spec.activeDeadlineSeconds || 0)}
        </DrawerItem>
        <DrawerItem name="Pods Statuses">
          {job.status?.ready === undefined
            ? `${job.status?.active || 0} Active / ${job.status?.succeeded || 0} Succeeded / ${job.status?.failed || 0} Failed`
            : `${job.status?.active || 0} Active (${job.status?.ready || 0} Ready) / ${job.status?.succeeded || 0} Succeeded / ${job.status?.failed || 0} Failed`}
        </DrawerItem>
        <DrawerItem name="Completed Indexes" hidden={!job.status?.completedIndexes}>
          {job.status?.completedIndexes}
        </DrawerItem>
        <PodDetailsTolerations workload={job} />
        <PodDetailsAffinities workload={job} />
        <DrawerItem name="Pod Status" className="pod-status">
          <PodDetailsStatuses pods={childPods} />
        </DrawerItem>
        <KubeObjectConditionsDrawer object={job} />
        <PodDetailsList pods={childPods} owner={job} />
      </div>
    );
  }
}

export const JobDetails = withInjectables<Dependencies, JobDetailsProps>(NonInjectedJobDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    podStore: di.inject(podStoreInjectable),
    jobStore: di.inject(jobStoreInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
