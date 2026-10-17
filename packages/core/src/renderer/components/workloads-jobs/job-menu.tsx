/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { jobApiInjectable } from "@freelensapp/kube-api-specifics";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import createWorkloadLogsTabInjectable from "../dock/logs/create-workload-logs-tab.injectable";
import { MenuItem } from "../menu";

import type { JobApi } from "@freelensapp/kube-api";
import type { Job } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";

import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import type { KubeObjectMenuProps } from "../kube-object-menu";

export interface JobMenuProps extends KubeObjectMenuProps<Job> {}

interface Dependencies {
  openConfirmDialog: OpenConfirmDialog;
  jobApi: JobApi;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  createWorkloadLogsTab: ReturnType<typeof createWorkloadLogsTabInjectable.instantiate>;
}

const NonInjectedJobMenu = ({
  object,
  toolbar,
  openConfirmDialog,
  jobApi,
  showCheckedErrorNotification,
  createWorkloadLogsTab,
}: Dependencies & JobMenuProps) => (
  <>
    <MenuItem onClick={() => createWorkloadLogsTab({ workload: object })}>
      <Icon material="subject" tooltip={`${object.kind} Logs`} interactive={toolbar} />
      <span className="title">Logs</span>
    </MenuItem>
    {object.isSuspend() ? (
      <MenuItem
        onClick={() =>
          openConfirmDialog({
            ok: async () => {
              try {
                await jobApi.resume({ namespace: object.getNs(), name: object.getName() });
              } catch (err) {
                showCheckedErrorNotification(err, "Unknown error occurred while resuming Job");
              }
            },
            labelOk: `Resume`,
            message: (
              <p>
                {"Resume Job "}
                <b>{object.getName()}</b>?
              </p>
            ),
          })
        }
      >
        <Icon material="play_circle_outline" tooltip="Resume" interactive={toolbar} />
        <span className="title">Resume</span>
      </MenuItem>
    ) : (
      <MenuItem
        onClick={() =>
          openConfirmDialog({
            ok: async () => {
              try {
                await jobApi.suspend({ namespace: object.getNs(), name: object.getName() });
              } catch (err) {
                showCheckedErrorNotification(err, "Unknown error occurred while suspending Job");
              }
            },
            labelOk: `Suspend`,
            message: (
              <p>
                {"Suspend Job "}
                <b>{object.getName()}</b>?
              </p>
            ),
          })
        }
      >
        <Icon material="pause_circle_filled" tooltip="Suspend" interactive={toolbar} />
        <span className="title">Suspend</span>
      </MenuItem>
    )}
  </>
);

export const JobMenu = withInjectables<Dependencies, JobMenuProps>(NonInjectedJobMenu, {
  getProps: (di, props) => ({
    ...props,
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    jobApi: di.inject(jobApiInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    createWorkloadLogsTab: di.inject(createWorkloadLogsTabInjectable),
  }),
});
