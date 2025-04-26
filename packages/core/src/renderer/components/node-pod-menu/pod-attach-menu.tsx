/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import type { Container } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { v4 as uuidv4 } from "uuid";
import { App } from "../../../extensions/common-api";
import type { DockTabCreateSpecific } from "../dock/dock/store";
import createTerminalTabInjectable from "../dock/terminal/create-terminal-tab.injectable";
import sendCommandInjectable, { type SendCommand } from "../dock/terminal/send-command.injectable";
import hideDetailsInjectable, { type HideDetails } from "../kube-detail-params/hide-details.injectable";
import PodMenuItem from "./pod-menu-item";

export interface PodAttachMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => void;
  sendCommand: SendCommand;
  hideDetails: HideDetails;
}

const NonInjectedPodAttachMenu: React.FC<PodAttachMenuProps & Dependencies> = (props) => {
  const { object, toolbar, createTerminalTab, sendCommand, hideDetails } = props;

  if (!object) return null;
  let pod: Pod;

  try {
    pod = new Pod(object);
  } catch (ex) {
    console.log(ex);

    return null;
  }

  const containers = pod.getRunningContainers();
  const statuses = pod.getContainerStatuses();

  const attachToPod = async (container: Container) => {
    const containerName = container.name;
    const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
    const commandParts = [kubectlPath, "attach", "-i", "-t", "-n", pod.getNs(), pod.getName()];

    if (containerName) {
      commandParts.push("-c", containerName);
    }

    const shellId = uuidv4();

    createTerminalTab({
      title: `Pod: ${pod.getName()} (namespace: ${pod.getNs()}) [Attached]`,
      id: shellId,
    });

    sendCommand(commandParts.join(" "), {
      enter: true,
      tabId: shellId,
    }).then(hideDetails);
  };

  return (
    <PodMenuItem
      material="pageview"
      title="Attach to Pod"
      tooltip="Attach to Pod"
      toolbar={toolbar}
      containers={containers}
      statuses={statuses}
      onMenuItemClick={attachToPod}
    />
  );
};

export const PodAttachMenu = withInjectables<Dependencies, PodAttachMenuProps>(NonInjectedPodAttachMenu, {
  getProps: (di, props) => ({
    ...props,
    createTerminalTab: di.inject(createTerminalTabInjectable),
    sendCommand: di.inject(sendCommandInjectable),
    hideDetails: di.inject(hideDetailsInjectable),
  }),
});
