/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import createTerminalTabInjectable from "../dock/terminal/create-terminal-tab.injectable";
import hideDetailsInjectable, { type HideDetails } from "../kube-detail-params/hide-details.injectable";
import PodMenuItem from "./pod-menu-item";

import type { Container } from "@freelensapp/kube-object";

import type { PodTerminalTarget } from "../../../features/pod-terminal/common/pod-terminal";
import type { DockTabCreateSpecific } from "../dock/dock/store";

export interface PodAttachMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => void;
  hideDetails: HideDetails;
}

const NonInjectedPodAttachMenu: React.FC<PodAttachMenuProps & Dependencies> = (props) => {
  const { object, toolbar, createTerminalTab, hideDetails } = props;

  if (!object) return null;
  let pod: Pod;

  try {
    pod = new Pod(object);
  } catch (ex) {
    console.log(ex);

    return null;
  }

  const containers = pod.getRunningContainersWithType();
  const statuses = pod.getContainerStatuses();
  const annotations = pod.metadata.annotations;

  const attachToPod = (container: Container) => {
    const podTerminal: PodTerminalTarget = {
      mode: "attach",
      namespace: pod.getNs(),
      pod: pod.getName(),
      container: container.name || undefined,
    };

    createTerminalTab({
      title: `Pod: ${pod.getName()} (namespace: ${pod.getNs()}) [Attached]`,
      podTerminal,
    });
    hideDetails();
  };

  return (
    <PodMenuItem
      material="pageview"
      title="Attach to Pod"
      tooltip="Attach to Pod"
      toolbar={toolbar}
      containers={containers}
      annotations={annotations}
      statuses={statuses}
      onMenuItemClick={attachToPod}
    />
  );
};

export const PodAttachMenu = withInjectables<Dependencies, PodAttachMenuProps>(NonInjectedPodAttachMenu, {
  getProps: (di, props) => ({
    ...props,
    createTerminalTab: di.inject(createTerminalTabInjectable),
    hideDetails: di.inject(hideDetailsInjectable),
  }),
});
