/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Pod } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { App } from "../../../extensions/common-api";
import openConfirmDialogInjectable, { type OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import sendCommandInjectable, { type SendCommand } from "../dock/terminal/send-command.injectable";
import hideDetailsInjectable, { type HideDetails } from "../kube-detail-params/hide-details.injectable";
import { MenuItem } from "../menu";

export interface ForceDeleteMenuItemProps {
  object: any;
  toolbar: boolean;
}

interface Dependencies {
  sendCommand: SendCommand;
  openConfirmDialog: OpenConfirmDialog;
  hideDetails: HideDetails;
}

const NonInjectedForceDeleteMenuItem: React.FC<ForceDeleteMenuItemProps & Dependencies> = (props) => {
  const { object, toolbar, sendCommand, openConfirmDialog, hideDetails } = props;

  if (!object) return null;
  let pod: Pod;

  try {
    pod = new Pod(object);
  } catch (ex) {
    return null;
  }

  const podName = pod.getName();
  const namespace = pod.getNs();
  const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";

  const forceDelete = () => {
    const command = `${kubectlPath} delete pod ${podName} -n ${namespace} --force --grace-period=0`;

    openConfirmDialog({
      ok: () =>
        sendCommand(command, {
          enter: true,
          newTab: true,
        }).then(hideDetails),
      labelOk: `Force Delete Pod`,
      message: (
        <p>
          {"Are you sure you want to force delete pod "}
          <b>{podName}</b>?
        </p>
      ),
    });
  };

  return (
    <MenuItem onClick={forceDelete}>
      <Icon material="delete_forever" tooltip={toolbar && "Force Delete"} interactive={toolbar} />
      <span className="title">Force Delete</span>
    </MenuItem>
  );
};

export const ForceDeleteMenuItem = withInjectables<Dependencies, ForceDeleteMenuItemProps>(
  NonInjectedForceDeleteMenuItem,
  {
    getProps: (di, props) => ({
      ...props,
      sendCommand: di.inject(sendCommandInjectable),
      openConfirmDialog: di.inject(openConfirmDialogInjectable),
      hideDetails: di.inject(hideDetailsInjectable),
    }),
  },
);
