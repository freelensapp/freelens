/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import createWorkloadLogsTabInjectable from "../dock/logs/create-workload-logs-tab.injectable";
import { MenuItem } from "../menu";
import openReplicaSetScaleDialogInjectable from "./scale-dialog/open.injectable";

import type { ReplicaSet } from "@freelensapp/kube-object";

import type { KubeObjectMenuProps } from "../kube-object-menu";
import type { OpenReplicaSetScaleDialog } from "./scale-dialog/open.injectable";

export interface ReplicaSetMenuProps extends KubeObjectMenuProps<ReplicaSet> {}

interface Dependencies {
  openReplicaSetScaleDialog: OpenReplicaSetScaleDialog;
  createWorkloadLogsTab: ReturnType<typeof createWorkloadLogsTabInjectable.instantiate>;
}

const NonInjectedReplicaSetMenu = ({
  object,
  toolbar,
  openReplicaSetScaleDialog,
  createWorkloadLogsTab,
}: Dependencies & ReplicaSetMenuProps) => (
  <>
    <MenuItem onClick={() => createWorkloadLogsTab({ workload: object })}>
      <Icon material="subject" tooltip={`${object.kind} Logs`} interactive={toolbar} />
      <span className="title">Logs</span>
    </MenuItem>
    <MenuItem onClick={() => openReplicaSetScaleDialog(object)}>
      <Icon material="open_with" tooltip="Scale" interactive={toolbar} />
      <span className="title">Scale</span>
    </MenuItem>
  </>
);

export const ReplicaSetMenu = withInjectables<Dependencies, ReplicaSetMenuProps>(NonInjectedReplicaSetMenu, {
  getProps: (di, props) => ({
    ...props,
    openReplicaSetScaleDialog: di.inject(openReplicaSetScaleDialogInjectable),
    createWorkloadLogsTab: di.inject(createWorkloadLogsTabInjectable),
  }),
});
