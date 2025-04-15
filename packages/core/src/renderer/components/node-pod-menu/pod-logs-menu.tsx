/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Container } from "@freelensapp/kube-object";
import { Pod } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import createPodLogsTabInjectable, { type PodLogsTabData } from "../dock/logs/create-pod-logs-tab.injectable";
import hideDetailsInjectable, { type HideDetails } from "../kube-detail-params/hide-details.injectable";
import PodMenuItem from "./pod-menu-item";

export interface NonInjectablePodLogsMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  hideDetails: HideDetails;
  createPodLogsTab: ({ selectedPod, selectedContainer }: PodLogsTabData) => any;
}

const NonInjectablePodLogsMenu: React.FC<NonInjectablePodLogsMenuProps & Dependencies> = (props) => {
  const { object, toolbar, hideDetails, createPodLogsTab } = props;

  if (!object) return null;
  let pod: Pod;

  try {
    pod = new Pod(object);
  } catch (ex) {
    console.log(ex);

    return null;
  }

  const containers = pod.getAllContainers();
  const statuses = pod.getContainerStatuses();

  const showLogs = (container: Container) => {
    const pod = props.object;

    createPodLogsTab({
      selectedPod: pod,
      selectedContainer: container,
    });
    hideDetails();
  };

  return (
    <PodMenuItem
      material="subject"
      title="Logs"
      tooltip="Pod Logs"
      toolbar={toolbar}
      containers={containers}
      statuses={statuses}
      onMenuItemClick={showLogs}
    />
  );
};

export const PodLogsMenu = withInjectables<Dependencies, NonInjectablePodLogsMenuProps>(NonInjectablePodLogsMenu, {
  getProps: (di, props) => ({
    ...props,
    hideDetails: di.inject(hideDetailsInjectable),
    createPodLogsTab: di.inject(createPodLogsTabInjectable),
  }),
});
