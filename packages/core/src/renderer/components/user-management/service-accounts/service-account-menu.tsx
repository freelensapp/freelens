/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";

import { Icon } from "@freelensapp/icon";
import type { ServiceAccount } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { KubeObjectMenuProps } from "../../kube-object-menu";
import type { OpenServiceAccountKubeConfigDialog } from "../../kubeconfig-dialog/open-service-account-kube-config-dialog.injectable";
import openServiceAccountKubeConfigDialogInjectable from "../../kubeconfig-dialog/open-service-account-kube-config-dialog.injectable";
import { MenuItem } from "../../menu";

interface Dependencies {
  openServiceAccountKubeConfigDialog: OpenServiceAccountKubeConfigDialog;
}

function NonInjectedServiceAccountMenu(props: KubeObjectMenuProps<ServiceAccount> & Dependencies) {
  const { object, toolbar, openServiceAccountKubeConfigDialog } = props;

  return (
    <MenuItem onClick={() => openServiceAccountKubeConfigDialog(object)}>
      <Icon material="insert_drive_file" tooltip="Kubeconfig File" interactive={toolbar} />
      <span className="title">Kubeconfig</span>
    </MenuItem>
  );
}

export const ServiceAccountMenu = withInjectables<Dependencies, KubeObjectMenuProps<ServiceAccount>>(
  NonInjectedServiceAccountMenu,
  {
    getProps: (di, props) => ({
      ...props,
      openServiceAccountKubeConfigDialog: di.inject(openServiceAccountKubeConfigDialogInjectable),
    }),
  },
);
