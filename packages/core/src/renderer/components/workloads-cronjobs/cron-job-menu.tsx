/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import type { CronJobApi } from "@freelensapp/kube-api";
import { cronJobApiInjectable } from "@freelensapp/kube-api-specifics";
import type { CronJob } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import type { KubeObjectMenuProps } from "../kube-object-menu";
import { MenuItem } from "../menu";
import type { OpenCronJobTriggerDialog } from "./trigger-dialog/open.injectable";
import openCronJobTriggerDialogInjectable from "./trigger-dialog/open.injectable";

export interface CronJobMenuProps extends KubeObjectMenuProps<CronJob> {}

interface Dependencies {
  openConfirmDialog: OpenConfirmDialog;
  openCronJobTriggerDialog: OpenCronJobTriggerDialog;
  cronJobApi: CronJobApi;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

const NonInjectedCronJobMenu = ({
  object,
  toolbar,
  openConfirmDialog,
  openCronJobTriggerDialog,
  cronJobApi,
  showCheckedErrorNotification,
}: Dependencies & CronJobMenuProps) => (
  <>
    <MenuItem onClick={() => openCronJobTriggerDialog(object)}>
      <Icon material="play_circle_filled" tooltip="Trigger" interactive={toolbar} />
      <span className="title">Trigger</span>
    </MenuItem>

    {object.isSuspend() ? (
      <MenuItem
        onClick={() =>
          openConfirmDialog({
            ok: async () => {
              try {
                await cronJobApi.resume({ namespace: object.getNs(), name: object.getName() });
              } catch (err) {
                showCheckedErrorNotification(err, "Unknown error occurred while resuming CronJob");
              }
            },
            labelOk: `Resume`,
            message: (
              <p>
                {"Resume CronJob "}
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
                await cronJobApi.suspend({ namespace: object.getNs(), name: object.getName() });
              } catch (err) {
                showCheckedErrorNotification(err, "Unknown error occurred while suspending CronJob");
              }
            },
            labelOk: `Suspend`,
            message: (
              <p>
                {"Suspend CronJob "}
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

export const CronJobMenu = withInjectables<Dependencies, CronJobMenuProps>(NonInjectedCronJobMenu, {
  getProps: (di, props) => ({
    ...props,
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    openCronJobTriggerDialog: di.inject(openCronJobTriggerDialogInjectable),
    cronJobApi: di.inject(cronJobApiInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
  }),
});
