import React from "react";
import { observer } from "mobx-react";
import { Pod } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import pLimit from "p-limit";
import { cpuUnitsToNumber, unitsToBytes, bytesToUnits } from "@freelensapp/utilities";

import { podMetricsWatcherNamespacesInjectable } from "../pod-metrics-api-watcher-namespaces.injectable";
import { podMetricsApiWatcherInjectable } from "../pod-metrics-api-watcher.injectable";

const emptyMetrics = { cpu: 0, memory: 0 };

function calculatePodKubeMetrics(pod: Pod, metrics: any): { cpu: number; memory: number } {
  if (!metrics) return emptyMetrics;
  return pod.getContainers().reduce((total, container) => {
    const metric = metrics.containers.find((item: any) => item.name === container.name);
    const cpu = metric?.usage?.cpu ?? "0";
    const memory = metric?.usage?.memory ?? "0";
    return {
      cpu: total.cpu + (cpuUnitsToNumber(cpu) ?? 0),
      memory: total.memory + unitsToBytes(memory),
    };
  }, emptyMetrics);
}

function getPodKubeMetrics(pod: Pod, metrics: any[]): { cpu: number; memory: number } {
  const podMetrics = metrics.find(
    (m) => m.getName() === pod.getName() && m.getNs() === pod.getNs()
  );
  return podMetrics ? calculatePodKubeMetrics(pod, podMetrics) : emptyMetrics;
}

function getPodKubeMetricsMemoryDisplayValue(pod: Pod, metrics: any[]): string {
  return metrics.length
    ? bytesToUnits(getPodKubeMetrics(pod, metrics).memory, { precision: 1 })
    : "N/A";
}

const PodMetricsMemoryContent = observer(
  ({ pod, podMetrics }: { pod: Pod; podMetrics: { value: { get: () => any[] } } }) => {
    const metrics = podMetrics.value.get();
    return (
      <span className="pod-metrics pod-memory" data-testid={`pod-memory-${pod.getId()}`}>
        {getPodKubeMetricsMemoryDisplayValue(pod, metrics)}
      </span>
    );
  }
);

export const podsMetricsMemoryColumnInjectable = getInjectable({
  id: "pods-metrics-memory-column",
  instantiate: (di) => {
    const columnId = "metrics-memory";
    const podMetricsWatcherNamespaces = di.inject(podMetricsWatcherNamespacesInjectable);
    const podMetricsWatcher = di.inject(podMetricsApiWatcherInjectable)(
      podMetricsWatcherNamespaces,
      30,
      pLimit(2)
    );

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: 75,
      content: (object: any) =>
        object instanceof Pod ? (
          <PodMetricsMemoryContent pod={object} podMetrics={podMetricsWatcher} />
        ) : null,
      header: {
        title: "Memory",
        className: "metrics-memory",
        sortBy: columnId,
        id: columnId,
      },
      sortingCallBack: (object: any) => {
        if (!(object instanceof Pod)) return;
        const pod = object;
        const metrics = podMetricsWatcher.value.get();
        return getPodKubeMetrics(pod, metrics).memory;
      },
    };
  },
  injectionToken: kubeObjectListLayoutColumnInjectionToken,
});
