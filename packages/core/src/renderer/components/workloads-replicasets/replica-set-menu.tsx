/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import type { ReplicaSet } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import type { KubeObjectMenuProps } from "../kube-object-menu";
import { MenuItem } from "../menu";
import type { OpenReplicaSetScaleDialog } from "./scale-dialog/open.injectable";
import openReplicaSetScaleDialogInjectable from "./scale-dialog/open.injectable";

export interface ReplicaSetMenuProps extends KubeObjectMenuProps<ReplicaSet> {}

interface Dependencies {
  openReplicaSetScaleDialog: OpenReplicaSetScaleDialog;
}

const NonInjectedReplicaSetMenu = ({
  object,
  toolbar,
  openReplicaSetScaleDialog,
}: Dependencies & ReplicaSetMenuProps) => (
  <>
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
  }),
});
