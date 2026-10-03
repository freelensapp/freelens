/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./resource-selector.scss";

import { observer } from "mobx-react";
import { Badge } from "../../badge";
import { Select } from "../../select";
import { findOptimalDefaultContainerOfPod } from "./default-container-helper";

import type { Container, Pod } from "@freelensapp/kube-object";

import type { SingleValue } from "react-select";

import type { SelectOption } from "../../select";
import type { LogTabViewModel } from "./logs-view-model";

export interface LogResourceSelectorProps {
  model: LogTabViewModel;
}

function getMergedPodsBadge(model: LogTabViewModel) {
  const sourcePods = model.logSourcePods.get();
  const workloadPods = model.workloadPods.get();
  const names = sourcePods.map((pod) => pod.getName()).join(", ");
  const count = `${sourcePods.length} ${sourcePods.length === 1 ? "pod" : "pods"}`;

  if (sourcePods.length === workloadPods.length) {
    return { label: count, tooltip: names };
  }

  return {
    label: `${sourcePods.length} of ${workloadPods.length} pods`,
    tooltip: `Only the first ${sourcePods.length} pods by name are read: ${names}`,
  };
}

export const LogResourceSelector = observer(({ model }: LogResourceSelectorProps) => {
  const tabData = model.logTabData.get();

  if (!tabData) {
    return null;
  }

  const { selectedContainer, owner, namespace } = tabData;
  const isMerged = model.isMerged.get();
  const pod = model.pod.get();

  // The tab of a single pod has nothing to show without it. A combined tab
  // keeps its header while the workload has no pods, for instance in the
  // middle of a rollout.
  if (!pod && !isMerged) {
    return null;
  }

  // Sibling pods (for the switcher dropdown) are only relevant -- and only
  // looked up -- outside of merged mode, where a combined-logs tab's pods
  // come from `logSourcePods` instead (rendered separately below).
  const podOptions = isMerged
    ? []
    : model.pods.get().map((pod) => ({
        value: pod,
        label: pod.getName(),
      }));
  const allContainers = pod?.getAllContainers() ?? [];
  const container = allContainers.find((container) => container.name === selectedContainer) ?? null;
  const onContainerChange = (option: SingleValue<SelectOption<Container>>) => {
    if (!option) {
      return;
    }

    model.updateLogTabData({
      selectedContainer: option.value.name,
    });
    model.reloadLogs();
  };

  const onPodChange = (option: SingleValue<SelectOption<Pod>>) => {
    if (!option) {
      return;
    }

    model.updateLogTabData({
      selectedPodId: option.value.getId(),
      selectedContainer: findOptimalDefaultContainerOfPod(option.value)?.name,
    });
    model.renameTab(`Pod ${option.value.getName()}`);
    model.reloadLogs();
  };

  const containerSelectOptions = [
    {
      label: "Containers",
      options: (pod?.getContainers() ?? []).map((container) => ({
        value: container,
        label: container.name,
      })),
    },
    {
      label: "Init Containers",
      options: (pod?.getInitContainers() ?? []).map((container) => ({
        value: container,
        label: container.name,
      })),
    },
  ];

  return (
    <div className="LogResourceSelector flex gap-2 items-center">
      <span>Namespace</span> <Badge data-testid="namespace-badge" label={pod?.getNs() ?? namespace} />
      {owner && (
        <>
          <span>Owner</span> <Badge data-testid="namespace-badge" label={`${owner.kind} ${owner.name}`} />
        </>
      )}
      {isMerged ? (
        <>
          <span>Pods</span>
          <Badge data-testid="merged-pods-badge" {...getMergedPodsBadge(model)} />
        </>
      ) : (
        <>
          <span>Pod</span>
          <Select
            options={podOptions}
            value={pod}
            isClearable={false}
            onChange={onPodChange}
            className="pod-selector"
            menuClass="pod-selector-menu"
          />
        </>
      )}
      {pod && (
        <>
          <span>Container</span>
          <Select<Container, SelectOption<Container>, false>
            id="container-selector-input"
            options={containerSelectOptions}
            value={container}
            onChange={onContainerChange}
            className="container-selector"
            menuClass="container-selector-menu"
            controlShouldRenderValue
          />
        </>
      )}
    </div>
  );
});
