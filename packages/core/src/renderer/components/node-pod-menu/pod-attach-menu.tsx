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
//import os from "os";
import PodMenuItem from "./pod-menu-item";
import type { Container } from "@freelensapp/kube-object";
import { v4 as uuidv4 } from "uuid";
//import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
//import type { IComputedValue } from "mobx";

// For this to work we never need exec to be in the command, 
// and we should find a good way to wrap this function from where it's being called, 
// and advise the user that attach may not work on all pods, if the process doesn't support it
// See this note: https://stackoverflow.com/a/42013285


export interface PodAttachMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => void;
  sendCommand: SendCommand;
  hideDetails: HideDetails;
  //userShellSetting: IComputedValue<string>;
}

const NonInjectedPodAttachMenu: React.FC<PodAttachMenuProps & Dependencies> = props => {
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

  let attachToPod = async (container: Container) => {
    const containerName = container.name;
    const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
    const commandParts = [
      kubectlPath,
      "attach",
      "-i",
      "-t",
      "-n",
      pod.getNs(),
      pod.getName(),
    ];

    //const userShell = userShellSetting.get() || "";

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
    })
      .then(hideDetails);
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

export const PodAttachMenu = withInjectables<Dependencies, PodAttachMenuProps>(
  NonInjectedPodAttachMenu,
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
