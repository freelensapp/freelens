/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./view.scss";

import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import type { DialogProps } from "../../../dialog";
import { Dialog } from "../../../dialog";
import { Input } from "../../../input";
import { systemName } from "../../../input/input_validators";
import type { ShowDetails } from "../../../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../../../kube-detail-params/show-details.injectable";
import { SubTitle } from "../../../layout/sub-title";
import { NamespaceSelect } from "../../../namespaces/namespace-select";
import { Wizard, WizardStep } from "../../../wizard";
import type { ServiceAccountStore } from "../store";
import serviceAccountStoreInjectable from "../store.injectable";
import closeCreateServiceAccountDialogInjectable from "./close.injectable";
import type { CreateServiceAccountDialogState } from "./state.injectable";
import createServiceAccountDialogStateInjectable from "./state.injectable";

export interface CreateServiceAccountDialogProps extends Partial<DialogProps> {}

interface Dependencies {
  state: CreateServiceAccountDialogState;
  serviceAccountStore: ServiceAccountStore;
  closeCreateServiceAccountDialog: () => void;
  showDetails: ShowDetails;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

@observer
class NonInjectedCreateServiceAccountDialog extends React.Component<CreateServiceAccountDialogProps & Dependencies> {
  createAccount = async () => {
    const { closeCreateServiceAccountDialog, serviceAccountStore, state, showDetails, showCheckedErrorNotification } =
      this.props;

    try {
      const serviceAccount = await serviceAccountStore.create({
        namespace: state.namespace.get(),
        name: state.name.get(),
      });

      showDetails(serviceAccount.selfLink);
      closeCreateServiceAccountDialog();
    } catch (err) {
      showCheckedErrorNotification(err, "Unknown error occurred while creating service account");
    }
  };

  render() {
    const { closeCreateServiceAccountDialog, serviceAccountStore, state, ...dialogProps } = this.props;

    return (
      <Dialog
        {...dialogProps}
        className="CreateServiceAccountDialog"
        isOpen={state.isOpen.get()}
        close={closeCreateServiceAccountDialog}
      >
        <Wizard header={<h5>Create Service Account</h5>} done={closeCreateServiceAccountDialog}>
          <WizardStep nextLabel="Create" next={this.createAccount}>
            <SubTitle title="Account Name" />
            <Input
              autoFocus
              required
              placeholder="Enter a name"
              trim
              validators={systemName}
              value={state.name.get()}
              onChange={(v) => state.name.set(v.toLowerCase())}
            />
            <SubTitle title="Namespace" />
            <NamespaceSelect
              id="create-dialog-namespace-select-input"
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

export const CreateServiceAccountDialog = withInjectables<Dependencies, CreateServiceAccountDialogProps>(
  NonInjectedCreateServiceAccountDialog,
  {
    getProps: (di, props) => ({
      ...props,
      closeCreateServiceAccountDialog: di.inject(closeCreateServiceAccountDialogInjectable),
      serviceAccountStore: di.inject(serviceAccountStoreInjectable),
      showDetails: di.inject(showDetailsInjectable),
      state: di.inject(createServiceAccountDialogStateInjectable),
      showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    }),
  },
);
