/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./view.scss";

import { observer } from "mobx-react";
import React from "react";

import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { DialogProps } from "../../../dialog";
import { Dialog } from "../../../dialog";
import { Input } from "../../../input";
import type { ShowDetails } from "../../../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../../../kube-detail-params/show-details.injectable";
import { SubTitle } from "../../../layout/sub-title";
import { Wizard, WizardStep } from "../../../wizard";
import type { ClusterRoleStore } from "../store";
import clusterRoleStoreInjectable from "../store.injectable";
import closeAddClusterRoleDialogInjectable from "./close.injectable";
import type { AddClusterRoleDialogState } from "./state.injectable";
import addClusterRoleDialogStateInjectable from "./state.injectable";

export interface AddClusterRoleDialogProps extends Partial<DialogProps> {}

interface Dependencies {
  state: AddClusterRoleDialogState;
  clusterRoleStore: ClusterRoleStore;
  showDetails: ShowDetails;
  closeAddClusterRoleDialog: () => void;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

@observer
class NonInjectedAddClusterRoleDialog extends React.Component<AddClusterRoleDialogProps & Dependencies> {
  createRole = async () => {
    const { closeAddClusterRoleDialog, clusterRoleStore, showDetails, state, showCheckedErrorNotification } =
      this.props;

    try {
      const role = await clusterRoleStore.create({ name: state.clusterRoleName.get() });

      showDetails(role.selfLink);
      closeAddClusterRoleDialog();
    } catch (error) {
      showCheckedErrorNotification(error, "Unknown error occurred while creating the role");
    }
  };

  render() {
    const { closeAddClusterRoleDialog, clusterRoleStore, showDetails, state, ...dialogProps } = this.props;

    return (
      <Dialog
        {...dialogProps}
        className="AddClusterRoleDialog"
        isOpen={state.isOpen.get()}
        close={closeAddClusterRoleDialog}
      >
        <Wizard header={<h5>Create ClusterRole</h5>} done={closeAddClusterRoleDialog}>
          <WizardStep contentClass="flex gaps column" nextLabel="Create" next={this.createRole}>
            <SubTitle title="ClusterRole Name" />
            <Input
              required
              autoFocus
              placeholder="Name"
              iconLeft="supervisor_account"
              value={state.clusterRoleName.get()}
              onChange={(v) => state.clusterRoleName.set(v)}
            />
          </WizardStep>
        </Wizard>
      </Dialog>
    );
  }
}

export const AddClusterRoleDialog = withInjectables<Dependencies, AddClusterRoleDialogProps>(
  NonInjectedAddClusterRoleDialog,
  {
    getProps: (di, props) => ({
      ...props,
      closeAddClusterRoleDialog: di.inject(closeAddClusterRoleDialogInjectable),
      clusterRoleStore: di.inject(clusterRoleStoreInjectable),
      showDetails: di.inject(showDetailsInjectable),
      state: di.inject(addClusterRoleDialogStateInjectable),
      showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    }),
  },
);
