/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { statefulSetApiInjectable } from "@freelensapp/kube-api-specifics";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import { MenuItem } from "../menu";

import type { StatefulSetApi } from "@freelensapp/kube-api";
import type { StatefulSet } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";

import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import type { KubeObjectMenuProps } from "../kube-object-menu";

export interface StatefulSetMenuProps extends KubeObjectMenuProps<StatefulSet> {}

interface Dependencies {
  statefulSetApi: StatefulSetApi;
  openConfirmDialog: OpenConfirmDialog;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

const NonInjectedStatefulSetMenu = ({
  statefulSetApi,
  object,
  toolbar,
  showCheckedErrorNotification,
  openConfirmDialog,
}: Dependencies & StatefulSetMenuProps) => (
  <>
    <MenuItem
      onClick={() =>
        openConfirmDialog({
          ok: async () => {
            try {
              await statefulSetApi.restart({
                namespace: object.getNs(),
                name: object.getName(),
              });
            } catch (err) {
              showCheckedErrorNotification(err, "Unknown error occurred while restarting StatefulSet");
            }
          },
          labelOk: "Restart",
          message: (
            <p>
              {"Are you sure you want to restart StatefulSet "}
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

export const StatefulSetMenu = withInjectables<Dependencies, StatefulSetMenuProps>(NonInjectedStatefulSetMenu, {
  getProps: (di, props) => ({
    ...props,
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    statefulSetApi: di.inject(statefulSetApiInjectable),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
  }),
});
