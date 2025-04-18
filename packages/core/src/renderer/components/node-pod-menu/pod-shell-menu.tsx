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
//import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
//import type { IComputedValue } from "mobx";

// For this to work we always need exec to be the second element in the array

export interface PodShellMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => void;
  sendCommand: SendCommand;
  hideDetails: HideDetails;
  //userShellSetting: IComputedValue<string>;
}

const NonInjectablePodShellMenu: React.FC<PodShellMenuProps & Dependencies> = props => {
  const {
    object,
    toolbar,
    createTerminalTab,
    sendCommand,
    hideDetails,
    //userShellSetting,
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
  // TODO: scaffolding for refactoring per SHELL_LOGIC.md
  //let currentShell = getBasenameOfPath(shellPath);

  let execShell = async (container: Container) => {
    const containerName = container.name;
    const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
    let commandParts = [
      kubectlPath,
      //"exec", // This is duplicated in the os.platform command below, and believe it's behavior is functionally null on the unshift
      "-i",
      "-t",
      "-n",
      pod.getNs(),
      pod.getName(),
    ];

    // Debugging: Log the initial value of commandParts
    console.debug("Initial commandParts:", commandParts);

    // get user's preferred shell from state
    //const userShell = userShellSetting.get() || "";

    // This adds the exec command for non-windows platforms as the first element in the array
    // we'd like this to also check if the shell is powershell as an && != check
    if (
      os.platform() !== "win32"
    ) {
      console.debug("Powershell not detected, adding exec to commandParts");
      //commandParts.unshift("exec");
      commandParts.splice(1, 0, "exec");
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
      //userShellSetting: di.inject(userShellSettingInjectable),
    }),
  },
);
