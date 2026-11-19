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

import type { Container, EphemeralContainer } from "@freelensapp/kube-object";

import type { PodTerminalTarget } from "../../../features/pod-terminal/common/pod-terminal";
import type { DockTabCreateSpecific } from "../dock/dock/store";

export interface PodShellMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => void;
  hideDetails: HideDetails;
}

const NonInjectablePodShellMenu: React.FC<PodShellMenuProps & Dependencies> = (props) => {
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

  const execShell = (container: Container | EphemeralContainer) => {
    const podTerminal: PodTerminalTarget = {
      mode: "exec",
      namespace: pod.getNs(),
      pod: pod.getName(),
      container: container.name || undefined,
      windows: pod.getSelectedNodeOs() === "windows",
    };

    createTerminalTab({
      title: `Pod: ${pod.getName()} (namespace: ${pod.getNs()})`,
      podTerminal,
    });
    hideDetails();
  };

  return (
    <PodMenuItem
      svg="ssh"
      title="Shell"
      tooltip="Pod Shell"
      toolbar={toolbar}
      annotations={annotations}
      containers={containers}
      statuses={statuses}
      onMenuItemClick={execShell}
    />
  );
};

export const PodShellMenu = withInjectables<Dependencies, PodShellMenuProps>(NonInjectablePodShellMenu, {
  getProps: (di, props) => ({
    ...props,
    createTerminalTab: di.inject(createTerminalTabInjectable),
    hideDetails: di.inject(hideDetailsInjectable),
  }),
});
