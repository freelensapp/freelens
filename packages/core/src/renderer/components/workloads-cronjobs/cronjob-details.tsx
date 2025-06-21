/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./cronjob-details.scss";

import { CronJob } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { formatDuration } from "@freelensapp/utilities/dist";
import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { Badge } from "../badge/badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import jobStoreInjectable from "../workloads-jobs/store.injectable";
import cronJobStoreInjectable from "./store.injectable";

import type { Job } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { JobStore } from "../workloads-jobs/store";
import type { CronJobStore } from "./store";

export interface CronJobDetailsProps extends KubeObjectDetailsProps<CronJob> {}

interface Dependencies {
  subscribeStores: SubscribeStores;
  jobStore: JobStore;
  cronJobStore: CronJobStore;
  logger: Logger;
  getDetailsUrl: GetDetailsUrl;
}

@observer
class NonInjectedCronJobDetails extends React.Component<CronJobDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [this.props.subscribeStores([this.props.jobStore])]);
  }

  render() {
    const { object: cronJob, jobStore, cronJobStore, getDetailsUrl } = this.props;

    if (!cronJob) {
      return null;
    }

    if (!(cronJob instanceof CronJob)) {
      this.props.logger.error("[CronJobDetails]: passed object that is not an instanceof CronJob", cronJob);

      return null;
    }

    const childJobs = jobStore.getJobsByOwner(cronJob);

    return (
      <div className="CronJobDetails">
        <DrawerItem name="Schedule">
          {cronJob.isNeverRun() ? `never (${cronJob.getSchedule()})` : cronJob.getSchedule()}
        </DrawerItem>
        <DrawerItem name="Timezone">{cronJob.spec.timeZone}</DrawerItem>
        <DrawerItem name="Suspend">{cronJob.getSuspendFlag()}</DrawerItem>
        <DrawerItem name="Last schedule">{cronJob.getLastScheduleTime()}</DrawerItem>
        <DrawerItem name="Active">{cronJobStore.getActiveJobsNum(cronJob)}</DrawerItem>

        {cronJob.spec.jobTemplate && (
          <>
            <DrawerTitle>Template</DrawerTitle>
            <DrawerItem name="Parallelism">{cronJob.getJobParallelism()}</DrawerItem>
            <DrawerItem name="Completions">{cronJob.getJobDesiredCompletions()}</DrawerItem>
            <DrawerItem name="Completion Mode" hidden={!cronJob.spec.jobTemplate.spec?.completionMode}>
              {cronJob.spec.jobTemplate.spec?.completionMode}
            </DrawerItem>
            <DrawerItem name="Suspend">{cronJob.getJobSuspendFlag()}</DrawerItem>
            <DrawerItem name="Backoff Limit" hidden={cronJob.spec.jobTemplate.spec?.backoffLimit !== undefined}>
              {cronJob.spec.jobTemplate.spec?.backoffLimit}
            </DrawerItem>
            <DrawerItem
              name="TTL Seconds After Finished"
              hidden={cronJob.spec.jobTemplate.spec?.ttlSecondsAfterFinished !== undefined}
            >
              {formatDuration(cronJob.spec.jobTemplate.spec?.ttlSecondsAfterFinished || 0)}
            </DrawerItem>
            <DrawerItem name="Active Deadline Seconds" hidden={!cronJob.spec.jobTemplate.spec?.activeDeadlineSeconds}>
              {formatDuration(cronJob.spec.jobTemplate.spec?.activeDeadlineSeconds || 0)}
            </DrawerItem>
          </>
        )}

        {childJobs.length > 0 && (
          <>
            <DrawerTitle>Jobs</DrawerTitle>
            {childJobs.map((job: Job) => {
              const selectors = job.getSelectors();
              const condition = job.getCondition();

              return (
                <div className="job" key={cronJob.getId()}>
                  <div className="title">
                    <Link to={() => (job.selfLink ? getDetailsUrl(job.selfLink) : "")}>{cronJob.getName()}</Link>
                  </div>
                  <DrawerItem name="Condition" className="conditions" labelsOnly>
                    {condition && <Badge label={condition.type} className={kebabCase(condition.type)} />}
                  </DrawerItem>
                  <DrawerItem name="Selector" labelsOnly>
                    {selectors.map((label) => (
                      <Badge key={label} label={label} />
                    ))}
                  </DrawerItem>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }
}

export const CronJobDetails = withInjectables<Dependencies, CronJobDetailsProps>(NonInjectedCronJobDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    cronJobStore: di.inject(cronJobStoreInjectable),
    jobStore: di.inject(jobStoreInjectable),
    logger: di.inject(loggerInjectionToken),
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
  }),
});
