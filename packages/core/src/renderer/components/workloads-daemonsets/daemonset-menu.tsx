/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { daemonSetApiInjectable } from "@freelensapp/kube-api-specifics";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import createWorkloadLogsTabInjectable from "../dock/logs/create-workload-logs-tab.injectable";
import { MenuItem } from "../menu";

import type { DaemonSetApi } from "@freelensapp/kube-api";
import type { DaemonSet } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";

import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import type { KubeObjectMenuProps } from "../kube-object-menu";

export interface DaemonSetMenuProps extends KubeObjectMenuProps<DaemonSet> {}

interface Dependencies {
  daemonSetApi: DaemonSetApi;
  openConfirmDialog: OpenConfirmDialog;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  createWorkloadLogsTab: ReturnType<typeof createWorkloadLogsTabInjectable.instantiate>;
}

const NonInjectedDaemonSetMenu = ({
  daemonSetApi,
  object,
  toolbar,
  openConfirmDialog,
  showCheckedErrorNotification,
  createWorkloadLogsTab,
}: Dependencies & DaemonSetMenuProps) => (
  <>
    <MenuItem onClick={() => createWorkloadLogsTab({ workload: object })}>
      <Icon material="subject" tooltip={`${object.kind} Logs`} interactive={toolbar} />
      <span className="title">Logs</span>
    </MenuItem>
    <MenuItem
      onClick={() =>
        openConfirmDialog({
          ok: async () => {
            try {
              await daemonSetApi.restart({
                namespace: object.getNs(),
                name: object.getName(),
              });
            } catch (err) {
              showCheckedErrorNotification(err, "Unknown error occurred while restarting DaemonSet");
            }
          },
          labelOk: "Restart",
          message: (
            <p>
              {"Are you sure you want to restart DaemonSet "}
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

export const DaemonSetMenu = withInjectables<Dependencies, DaemonSetMenuProps>(NonInjectedDaemonSetMenu, {
  getProps: (di, props) => ({
    ...props,
    daemonSetApi: di.inject(daemonSetApiInjectable),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    createWorkloadLogsTab: di.inject(createWorkloadLogsTabInjectable),
  }),
});
