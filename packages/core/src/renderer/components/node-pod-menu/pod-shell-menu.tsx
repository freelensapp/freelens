/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import type { DockTabCreateSpecific } from "../dock/dock/store";
import sendCommandInjectable, { type SendCommand } from "../dock/terminal/send-command.injectable";
import hideDetailsInjectable, { type HideDetails } from "../kube-detail-params/hide-details.injectable";
import { App } from "../../../extensions/common-api";
import { withInjectables } from "@ogre-tools/injectable-react";
import createTerminalTabInjectable from "../dock/terminal/create-terminal-tab.injectable";
import { Pod } from "@freelensapp/kube-object";
import os from "os";
import PodMenuItem from "./pod-menu-item";
import type { Container } from "@freelensapp/kube-object";
import { v4 as uuidv4 } from "uuid";

export interface PodShellMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => void;
  sendCommand: SendCommand;
  hideDetails: HideDetails;
}

const NonInjectablePodShellMenu: React.FC<PodShellMenuProps & Dependencies> = props => {
  const {
    object,
    toolbar,
    createTerminalTab,
    sendCommand,
    hideDetails,
  } = props;

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

  const execShell = async (container: Container) =>  {
    const containerName = container.name;
    const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
    const commandParts = [
      kubectlPath,
      "exec",
      "-i",
      "-t",
      "-n",
      pod.getNs(),
      pod.getName(),
    ];

    if (os.platform() !== "win32") {
      commandParts.unshift("exec");
    }

    if (containerName) {
      commandParts.push("-c", containerName);
    }

    commandParts.push("--");

    if (pod.getSelectedNodeOs() === "windows") {
      commandParts.push("powershell");
    } else {
      commandParts.push('sh -c "clear; (bash || ash || sh)"');
    }

    const shellId = uuidv4();

    createTerminalTab({
      title: `Pod: ${pod.getName()} (namespace: ${pod.getNs()})`,
      id: shellId,
    });

    sendCommand(commandParts.join(" "), {
      enter: true,
      tabId: shellId,
    })
      .then(hideDetails);
  };

  return (
    <PodMenuItem
      svg="ssh"
      title="Shell"
      tooltip="Pod Shell"
      toolbar={toolbar}
      containers={containers}
      statuses={statuses}
      onMenuItemClick={execShell}
    />
  );
};

export const PodShellMenu = withInjectables<Dependencies, PodShellMenuProps>(
  NonInjectablePodShellMenu,
  {
    getProps: (di, props) => ({
      ...props,
      createTerminalTab: di.inject(createTerminalTabInjectable),
      sendCommand: di.inject(sendCommandInjectable),
      hideDetails: di.inject(hideDetailsInjectable),
    }),
  },
);
