/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { deploymentApiInjectable } from "@freelensapp/kube-api-specifics";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import createWorkloadLogsTabInjectable from "../dock/logs/create-workload-logs-tab.injectable";
import { MenuItem } from "../menu";
import openDeploymentScaleDialogInjectable from "./scale/open.injectable";
import deploymentStoreInjectable from "./store.injectable";

import type { DeploymentApi } from "@freelensapp/kube-api";
import type { Deployment } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";

import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import type { KubeObjectMenuProps } from "../kube-object-menu";
import type { OpenDeploymentScaleDialog } from "./scale/open.injectable";
import type { DeploymentStore } from "./store";

export interface DeploymentMenuProps extends KubeObjectMenuProps<Deployment> {}

interface Dependencies {
  openDeploymentScaleDialog: OpenDeploymentScaleDialog;
  deploymentApi: DeploymentApi;
  deploymentStore: DeploymentStore;
  openConfirmDialog: OpenConfirmDialog;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  createWorkloadLogsTab: ReturnType<typeof createWorkloadLogsTabInjectable.instantiate>;
}

const NonInjectedDeploymentMenu = ({
  deploymentApi,
  deploymentStore,
  object,
  openDeploymentScaleDialog,
  toolbar,
  openConfirmDialog,
  showCheckedErrorNotification,
  createWorkloadLogsTab,
}: Dependencies & DeploymentMenuProps) => (
  <>
    <MenuItem onClick={() => createWorkloadLogsTab({ workload: object, pods: deploymentStore.getChildPods(object) })}>
      <Icon material="subject" tooltip={`${object.kind} Logs`} interactive={toolbar} />
      <span className="title">Logs</span>
    </MenuItem>
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
    deploymentStore: di.inject(deploymentStoreInjectable),
    openDeploymentScaleDialog: di.inject(openDeploymentScaleDialogInjectable),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    createWorkloadLogsTab: di.inject(createWorkloadLogsTabInjectable),
  }),
});
