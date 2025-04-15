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
import { NamespaceSelect } from "../../../namespaces/namespace-select";
import { Wizard, WizardStep } from "../../../wizard";
import type { RoleStore } from "../store";
import roleStoreInjectable from "../store.injectable";
import closeAddRoleDialogInjectable from "./close.injectable";
import type { AddRoleDialogState } from "./state.injectable";
import addRoleDialogStateInjectable from "./state.injectable";

export interface AddRoleDialogProps extends Partial<DialogProps> {}

interface Dependencies {
  closeAddRoleDialog: () => void;
  showDetails: ShowDetails;
  state: AddRoleDialogState;
  roleStore: RoleStore;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

@observer
class NonInjectedAddRoleDialog extends React.Component<AddRoleDialogProps & Dependencies> {
  createRole = async () => {
    const { closeAddRoleDialog, roleStore, state, showDetails, showCheckedErrorNotification } = this.props;

    try {
      const role = await roleStore.create({
        name: state.roleName.get(),
        namespace: state.namespace.get(),
      });

      showDetails(role.selfLink);
      closeAddRoleDialog();
    } catch (err) {
      showCheckedErrorNotification(err, "Unknown error occurred while creating role");
    }
  };

  render() {
    const { closeAddRoleDialog, roleStore, state, ...dialogProps } = this.props;
    const header = <h5>Create Role</h5>;

    return (
      <Dialog {...dialogProps} className="AddRoleDialog" isOpen={state.isOpen.get()} close={closeAddRoleDialog}>
        <Wizard header={header} done={closeAddRoleDialog}>
          <WizardStep contentClass="flex gaps column" nextLabel="Create" next={this.createRole}>
            <SubTitle title="Role Name" />
            <Input
              required
              autoFocus
              placeholder="Name"
              iconLeft="supervisor_account"
              value={state.roleName.get()}
              onChange={(v) => state.roleName.set(v)}
            />
            <SubTitle title="Namespace" />
            <NamespaceSelect
              id="add-dialog-namespace-select-input"
              themeName="light"
              value={state.namespace.get()}
              onChange={(option) => state.namespace.set(option?.value ?? "default")}
            />
          </WizardStep>
        </Wizard>
      </Dialog>
    );
  }
}

export const AddRoleDialog = withInjectables<Dependencies, AddRoleDialogProps>(NonInjectedAddRoleDialog, {
  getProps: (di, props) => ({
    ...props,
    closeAddRoleDialog: di.inject(closeAddRoleDialogInjectable),
    roleStore: di.inject(roleStoreInjectable),
    showDetails: di.inject(showDetailsInjectable),
    state: di.inject(addRoleDialogStateInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
  }),
});
