import { Icon } from "@freelensapp/icon";
import type { DeploymentApi } from "@freelensapp/kube-api";
import { deploymentApiInjectable } from "@freelensapp/kube-api-specifics";
import type { Deployment } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import type { KubeObjectMenuProps } from "../kube-object-menu";
import { MenuItem } from "../menu";
import type { OpenDeploymentScaleDialog } from "./scale/open.injectable";
import openDeploymentScaleDialogInjectable from "./scale/open.injectable";

export interface DeploymentMenuProps extends KubeObjectMenuProps<Deployment> {}

interface Dependencies {
  openDeploymentScaleDialog: OpenDeploymentScaleDialog;
  deploymentApi: DeploymentApi;
  openConfirmDialog: OpenConfirmDialog;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

const NonInjectedDeploymentMenu = ({
  deploymentApi,
  object,
  openDeploymentScaleDialog,
  toolbar,
  openConfirmDialog,
  showCheckedErrorNotification,
}: Dependencies & DeploymentMenuProps) => (
  <>
    <MenuItem onClick={() => openDeploymentScaleDialog(object)}>
      <Icon material="open_with" tooltip="Scale" interactive={toolbar} />
      <span className="title">Scale</span>
    </MenuItem>
    <MenuItem
      onClick={() =>
        openConfirmDialog({
          ok: async () => {
            try {
              await deploymentApi.restart({
                namespace: object.getNs(),
                name: object.getName(),
              });
            } catch (err) {
              showCheckedErrorNotification(err, "Unknown error occurred while restarting deployment");
            }
          },
          labelOk: "Restart",
          message: (
            <p>
              {"Are you sure you want to restart deployment "}
              <b>{object.getName()}</b>?
            </p>
          ),
        })
      }
    >
      <Icon material="autorenew" tooltip="Restart" interactive={toolbar} />
      <span className="title">Restart</span>
    </MenuItem>
  </>
);

export const DeploymentMenu = withInjectables<Dependencies, DeploymentMenuProps>(NonInjectedDeploymentMenu, {
  getProps: (di, props) => ({
    ...props,
    deploymentApi: di.inject(deploymentApiInjectable),
    openDeploymentScaleDialog: di.inject(openDeploymentScaleDialogInjectable),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
  }),
});
