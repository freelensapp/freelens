/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { App } from "../../../extensions/common-api";
import createTerminalTabInjectable from "../dock/terminal/create-terminal-tab.injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import { MenuItem } from "../menu";
import { Icon } from "@freelensapp/icon";
import type { DockTabCreateSpecific } from "../dock/dock/store";
import openConfirmDialogInjectable, { type OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import sendCommandInjectable, { type SendCommand } from "../dock/terminal/send-command.injectable";
import hideDetailsInjectable, { type HideDetails } from "../kube-detail-params/hide-details.injectable";
import { Node } from "@freelensapp/kube-object";

export interface NodeMenuProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => void;
  sendCommand: SendCommand;
  openConfirmDialog: OpenConfirmDialog;
  hideDetails: HideDetails;
}

const NonInjectedNodeMenu: React.FC<NodeMenuProps & Dependencies> = props => {
  const {
    object,
    toolbar,
    createTerminalTab,
    sendCommand,
    openConfirmDialog,
    hideDetails,
  } = props;

  if (!object) return null;
  let node: Node;

  try {
    node = new Node(object);
  } catch (ex) {
    return null;
  }

  const nodeName = node.getName();
  const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";

  const sendToTerminal = (command: string) => {
    sendCommand(command, {
      enter: true,
      newTab: true,
    })
      .then(hideDetails);
  };

  const shell = () => {
    createTerminalTab({
      title: `Node: ${nodeName}`,
      node: nodeName,
    });
    hideDetails();
  };

  const cordon = () => {
    sendToTerminal(`${kubectlPath} cordon ${nodeName}`);
  };

  const unCordon = () => {
    sendToTerminal(`${kubectlPath} uncordon ${nodeName}`);
  };

  const drain = () => {
    const command = `${kubectlPath} drain ${nodeName} --delete-emptydir-data --ignore-daemonsets --force`;

    openConfirmDialog({
      ok: () => sendToTerminal(command),
      labelOk: `Drain Node`,
      message: (
        <p>
          {"Are you sure you want to drain "}
          <b>{nodeName}</b>
          ?
        </p>
      ),
    });
  };

  return (
    <>
      <MenuItem onClick={shell}>
        <Icon
          svg="ssh"
          interactive={toolbar}
          tooltip={toolbar && "Node shell"}
        />
        <span className="title">Shell</span>
      </MenuItem>
      {node.isUnschedulable() ? (
        <MenuItem onClick={unCordon}>
          <Icon
            material="play_circle_filled"
            tooltip={toolbar && "Uncordon"}
            interactive={toolbar}
          />
          <span className="title">Uncordon</span>
        </MenuItem>
      ) : (
        <MenuItem onClick={cordon}>
          <Icon
            material="pause_circle_filled"
            tooltip={toolbar && "Cordon"}
            interactive={toolbar}
          />
          <span className="title">Cordon</span>
        </MenuItem>
      )}
      <MenuItem onClick={drain}>
        <Icon
          material="delete_sweep"
          tooltip={toolbar && "Drain"}
          interactive={toolbar}
        />
        <span className="title">Drain</span>
      </MenuItem>
    </>
  );
};

export const NodeMenu = withInjectables<Dependencies, NodeMenuProps>(
  NonInjectedNodeMenu,
  {
    getProps: (di, props) => ({
      ...props,
      createTerminalTab: di.inject(createTerminalTabInjectable),
      sendCommand: di.inject(sendCommandInjectable),
      openConfirmDialog: di.inject(openConfirmDialogInjectable),
      hideDetails: di.inject(hideDetailsInjectable),
    }),
  },
);
