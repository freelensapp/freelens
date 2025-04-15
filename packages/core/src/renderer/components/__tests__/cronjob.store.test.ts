/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CronJob } from "@freelensapp/kube-object";
import directoryForKubeConfigsInjectable from "../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../stores-apis-can-be-created.injectable";
import type { CronJobStore } from "../workloads-cronjobs/store";
import cronJobStoreInjectable from "../workloads-cronjobs/store.injectable";

const scheduledCronJob = new CronJob({
  apiVersion: "foo",
  kind: "CronJob",
  metadata: {
    name: "scheduledCronJob",
    resourceVersion: "scheduledCronJob",
    uid: "scheduledCronJob",
    namespace: "default",
    selfLink: "/apis/batch/v1/cronjobs/default/scheduledCronJob",
  },
  spec: {
    schedule: "test",
    concurrencyPolicy: "test",
    suspend: false,
    jobTemplate: {
      metadata: {},
      spec: {
        template: {
          metadata: {},
          spec: {
            containers: [],
            restartPolicy: "restart",
            terminationGracePeriodSeconds: 1,
            dnsPolicy: "no",
            hostPID: true,
            schedulerName: "string",
          },
        },
      },
    },
    successfulJobsHistoryLimit: 1,
    failedJobsHistoryLimit: 1,
  },
});

const suspendedCronJob = new CronJob({
  apiVersion: "foo",
  kind: "CronJob",
  metadata: {
    name: "suspendedCronJob",
    resourceVersion: "suspendedCronJob",
    uid: "suspendedCronJob",
    namespace: "default",
    selfLink: "/apis/batch/v1/cronjobs/default/suspendedCronJob",
  },
  spec: {
    schedule: "test",
    concurrencyPolicy: "test",
    suspend: true,
    jobTemplate: {
      metadata: {},
      spec: {
        template: {
          metadata: {},
          spec: {
            containers: [],
            restartPolicy: "restart",
            terminationGracePeriodSeconds: 1,
            dnsPolicy: "no",
            hostPID: true,
            schedulerName: "string",
          },
        },
      },
    },
    successfulJobsHistoryLimit: 1,
    failedJobsHistoryLimit: 1,
  },
});

const otherSuspendedCronJob = new CronJob({
  apiVersion: "foo",
  kind: "CronJob",
  metadata: {
    name: "otherSuspendedCronJob",
    resourceVersion: "otherSuspendedCronJob",
    uid: "otherSuspendedCronJob",
    namespace: "default",
    selfLink: "/apis/batch/v1/cronjobs/default/otherSuspendedCronJob",
  },
  spec: {
    schedule: "test",
    concurrencyPolicy: "test",
    suspend: true,
    jobTemplate: {
      metadata: {},
      spec: {
        template: {
          metadata: {},
          spec: {
            containers: [],
            restartPolicy: "restart",
            terminationGracePeriodSeconds: 1,
            dnsPolicy: "no",
            hostPID: true,
            schedulerName: "string",
          },
        },
      },
    },
    successfulJobsHistoryLimit: 1,
    failedJobsHistoryLimit: 1,
  },
});

describe("CronJob Store tests", () => {
  let cronJobStore: CronJobStore;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
        }),
    );

    cronJobStore = di.inject(cronJobStoreInjectable);
  });

  it("gets CronJob statuses in proper sorting order", () => {
    const statuses = Object.entries(
      cronJobStore.getStatuses([suspendedCronJob, otherSuspendedCronJob, scheduledCronJob]),
    );

    expect(statuses).toEqual([
      ["scheduled", 1],
      ["suspended", 2],
    ]);
  });

  it("returns 0 for other statuses", () => {
    let statuses = Object.entries(cronJobStore.getStatuses([scheduledCronJob]));

    expect(statuses).toEqual([
      ["scheduled", 1],
      ["suspended", 0],
    ]);

    statuses = Object.entries(cronJobStore.getStatuses([suspendedCronJob]));

    expect(statuses).toEqual([
      ["scheduled", 0],
      ["suspended", 1],
    ]);
  });
});
