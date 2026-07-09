/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Injectable } from "@ogre-tools/injectable";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import namespaceMetricsInjectable from "../namespaces/metrics.injectable";
import { NamespaceMetricsDetailsComponent } from "../namespaces/metrics-details-component";
import ingressMetricsInjectable from "../network-ingresses/metrics.injectable";
import { IngressMetricsDetailsComponent } from "../network-ingresses/metrics-details-component";
import nodeMetricsInjectable from "../nodes/metrics.injectable";
import { NodeMetricsDetailsComponent } from "../nodes/metrics-details-component";
import persistentVolumeClaimMetricsInjectable from "../storage-volume-claims/metrics.injectable";
import { PersistentVolumeClaimMetricsDetailsComponent } from "../storage-volume-claims/metrics-details-component";
import { renderFor } from "../test-utils/renderFor";
import daemonSetMetricsInjectable from "../workloads-daemonsets/metrics.injectable";
import { DaemonSetMetricsDetailsComponent } from "../workloads-daemonsets/metrics-details-component";
import deploymentMetricsInjectable from "../workloads-deployments/metrics.injectable";
import { DeploymentMetricsDetailsComponent } from "../workloads-deployments/metrics-details-component";
import jobMetricsInjectable from "../workloads-jobs/metrics.injectable";
import { JobMetricsDetailsComponent } from "../workloads-jobs/metrics-details-component";
import podContainerMetricsInjectable from "../workloads-pods/container-metrics.injectable";
import podMetricsInjectable from "../workloads-pods/metrics.injectable";
import { podMetricTabs } from "../workloads-pods/pod-charts";
import { PodDetailsContainerMetrics } from "../workloads-pods/pod-details-container-metrics";
import PodMetricsDetailsComponent from "../workloads-pods/pod-metrics-details-component";
import replicaSetMetricsInjectable from "../workloads-replicasets/metrics.injectable";
import { ReplicaSetMetricsDetailsComponent } from "../workloads-replicasets/metrics-details-component";
import statefulSetMetricsInjectable from "../workloads-statefulsets/metrics.injectable";
import { StatefulSetMetricsDetailsComponent } from "../workloads-statefulsets/metrics-details-component";

import type {
  Container,
  DaemonSet,
  Deployment,
  Ingress,
  Job,
  Namespace,
  Node,
  PersistentVolumeClaim,
  Pod,
  ReplicaSet,
  StatefulSet,
} from "@freelensapp/kube-object";

import type { AtLeastOneMetricTab, ResourceMetricsProps } from "./resource-metrics";

let capturedProps: ResourceMetricsProps<string> | undefined;

vi.mock("./index", () => ({
  TimeRangedResourceMetrics: (props: ResourceMetricsProps<string>) => {
    capturedProps = props;

    return <div data-testid="time-ranged-resource-metrics" />;
  },
}));

type AdapterCase = {
  name: string;
  injectable: Injectable<unknown, unknown, any>;
  renderElement: () => React.ReactElement;
  expectedObject: unknown;
  expectedTabs: AtLeastOneMetricTab;
  expectedParams: unknown;
};

const namespace = {
  getId: () => "namespace-id",
  getName: () => "namespace-name",
  getNs: () => "namespace-name",
} as unknown as Namespace;

const ingress = {
  getId: () => "ingress-id",
  getName: () => "ingress-name",
  getNs: () => "ingress-ns",
} as unknown as Ingress;

const node = {
  getId: () => "node-id",
  getName: () => "node-name",
  getNs: () => "node-ns",
} as unknown as Node;

const persistentVolumeClaim = {
  getId: () => "pvc-id",
  getName: () => "pvc-name",
  getNs: () => "pvc-ns",
} as unknown as PersistentVolumeClaim;

const daemonSet = {
  getId: () => "daemon-set-id",
  getName: () => "daemon-set-name",
  getNs: () => "daemon-set-ns",
} as unknown as DaemonSet;

const deployment = {
  getId: () => "deployment-id",
  getName: () => "deployment-name",
  getNs: () => "deployment-ns",
} as unknown as Deployment;

const job = {
  getId: () => "job-id",
  getName: () => "job-name",
  getNs: () => "job-ns",
} as unknown as Job;

const pod = {
  getId: () => "pod-id",
  getName: () => "pod-name",
  getNs: () => "pod-ns",
} as unknown as Pod;

const container = {
  name: "pod-container",
} as Container;

const replicaSet = {
  getId: () => "replica-set-id",
  getName: () => "replica-set-name",
  getNs: () => "replica-set-ns",
} as unknown as ReplicaSet;

const statefulSet = {
  getId: () => "stateful-set-id",
  getName: () => "stateful-set-name",
  getNs: () => "stateful-set-ns",
} as unknown as StatefulSet;

const adapterCases: AdapterCase[] = [
  {
    name: "namespace details",
    injectable: namespaceMetricsInjectable,
    renderElement: () => <NamespaceMetricsDetailsComponent object={namespace} />,
    expectedObject: namespace,
    expectedTabs: podMetricTabs,
    expectedParams: {
      namespace,
    },
  },
  {
    name: "ingress details",
    injectable: ingressMetricsInjectable,
    renderElement: () => <IngressMetricsDetailsComponent object={ingress} />,
    expectedObject: ingress,
    expectedTabs: ["Network", "Duration"] as AtLeastOneMetricTab,
    expectedParams: {
      ingress,
    },
  },
  {
    name: "node details",
    injectable: nodeMetricsInjectable,
    renderElement: () => <NodeMetricsDetailsComponent object={node} />,
    expectedObject: node,
    expectedTabs: ["CPU", "Memory", "Disk", "Pods"] as AtLeastOneMetricTab,
    expectedParams: {
      node,
    },
  },
  {
    name: "persistent volume claim details",
    injectable: persistentVolumeClaimMetricsInjectable,
    renderElement: () => <PersistentVolumeClaimMetricsDetailsComponent object={persistentVolumeClaim} />,
    expectedObject: persistentVolumeClaim,
    expectedTabs: ["Disk"] as AtLeastOneMetricTab,
    expectedParams: {
      persistentVolumeClaim,
    },
  },
  {
    name: "daemon set details",
    injectable: daemonSetMetricsInjectable,
    renderElement: () => <DaemonSetMetricsDetailsComponent object={daemonSet} />,
    expectedObject: daemonSet,
    expectedTabs: podMetricTabs,
    expectedParams: {
      daemonSet,
    },
  },
  {
    name: "deployment details",
    injectable: deploymentMetricsInjectable,
    renderElement: () => <DeploymentMetricsDetailsComponent object={deployment} />,
    expectedObject: deployment,
    expectedTabs: podMetricTabs,
    expectedParams: {
      deployment,
    },
  },
  {
    name: "job details",
    injectable: jobMetricsInjectable,
    renderElement: () => <JobMetricsDetailsComponent object={job} />,
    expectedObject: job,
    expectedTabs: podMetricTabs,
    expectedParams: {
      job,
    },
  },
  {
    name: "pod details",
    injectable: podMetricsInjectable,
    renderElement: () => <PodMetricsDetailsComponent object={pod} />,
    expectedObject: pod,
    expectedTabs: podMetricTabs,
    expectedParams: {
      pod,
    },
  },
  {
    name: "pod container details",
    injectable: podContainerMetricsInjectable,
    renderElement: () => <PodDetailsContainerMetrics pod={pod} container={container} />,
    expectedObject: pod,
    expectedTabs: ["CPU", "Memory", "Filesystem"] as AtLeastOneMetricTab,
    expectedParams: {
      pod,
      container,
    },
  },
  {
    name: "replica set details",
    injectable: replicaSetMetricsInjectable,
    renderElement: () => <ReplicaSetMetricsDetailsComponent object={replicaSet} />,
    expectedObject: replicaSet,
    expectedTabs: podMetricTabs,
    expectedParams: {
      replicaSet,
    },
  },
  {
    name: "stateful set details",
    injectable: statefulSetMetricsInjectable,
    renderElement: () => <StatefulSetMetricsDetailsComponent object={statefulSet} />,
    expectedObject: statefulSet,
    expectedTabs: podMetricTabs,
    expectedParams: {
      statefulSet,
    },
  },
];

describe("metrics details adapters", () => {
  beforeEach(() => {
    capturedProps = undefined;
  });

  const runAdapterCase = ({
    expectedObject,
    expectedParams,
    expectedTabs,
    injectable,
    name,
    renderElement,
  }: AdapterCase) => {
    it(`wires ${name} through TimeRangedResourceMetrics`, () => {
      const di = getDiForUnitTesting();
      const render = renderFor(di);
      const metrics = {
        value: { get: vi.fn() },
        pending: { get: vi.fn() },
        invalidate: vi.fn(),
      };
      let capturedParams: unknown;

      di.override(injectable, (_di, params) => {
        capturedParams = params;

        return metrics as never;
      });

      render(renderElement());

      expect(capturedParams).toEqual(expectedParams);
      expect(capturedProps).toEqual(
        expect.objectContaining({
          object: expectedObject,
          tabs: expectedTabs,
          metrics,
        }),
      );
    });
  };

  adapterCases.forEach((testCase) => runAdapterCase(testCase));
});
