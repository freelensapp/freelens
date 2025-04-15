/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./view.scss";

import { Icon } from "@freelensapp/icon";
import type { RoleApi } from "@freelensapp/kube-api";
import { roleApiInjectable } from "@freelensapp/kube-api-specifics";
import type { ClusterRole, Role, ServiceAccount, Subject } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { ObservableHashSet, iter } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IObservableValue } from "mobx";
import { action, computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import type { DialogProps } from "../../../dialog";
import { Dialog } from "../../../dialog";
import { EditableList } from "../../../editable-list";
import { Input } from "../../../input";
import type { ShowDetails } from "../../../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../../../kube-detail-params/show-details.injectable";
import { SubTitle } from "../../../layout/sub-title";
import { NamespaceSelect } from "../../../namespaces/namespace-select";
import type { SelectOption } from "../../../select";
import { Select, onMultiSelectFor } from "../../../select";
import { Wizard, WizardStep } from "../../../wizard";
import type { ClusterRoleStore } from "../../cluster-roles/store";
import clusterRoleStoreInjectable from "../../cluster-roles/store.injectable";
import type { RoleStore } from "../../roles/store";
import roleStoreInjectable from "../../roles/store.injectable";
import type { ServiceAccountStore } from "../../service-accounts/store";
import serviceAccountStoreInjectable from "../../service-accounts/store.injectable";
import type { RoleBindingStore } from "../store";
import roleBindingStoreInjectable from "../store.injectable";
import closeRoleBindingDialogInjectable from "./close.injectable";
import type { RoleBindingDialogState } from "./state.injectable";
import roleBindingDialogStateInjectable from "./state.injectable";

export interface RoleBindingDialogProps extends Partial<DialogProps> {}

interface Dependencies {
  state: IObservableValue<RoleBindingDialogState>;
  roleBindingStore: RoleBindingStore;
  closeRoleBindingDialog: () => void;
  showDetails: ShowDetails;
  roleStore: RoleStore;
  clusterRoleStore: ClusterRoleStore;
  serviceAccountStore: ServiceAccountStore;
  roleApi: RoleApi;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

@observer
class NonInjectedRoleBindingDialog extends React.Component<RoleBindingDialogProps & Dependencies> {
  constructor(props: RoleBindingDialogProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  @computed get roleBinding() {
    return this.props.state.get().roleBinding;
  }

  @computed get isEditing() {
    return !!this.roleBinding;
  }

  @observable.ref selectedRoleRef: Role | ClusterRole | null | undefined = null;
  @observable bindingName = "";
  @observable bindingNamespace: string | null = null;
  selectedAccounts = new ObservableHashSet<ServiceAccount>([], (sa) => sa.getId());
  selectedUsers = observable.set<string>([]);
  selectedGroups = observable.set<string>([]);

  @computed get selectedBindings(): Subject[] {
    const serviceAccounts: Subject[] = Array.from(this.selectedAccounts, (sa) => ({
      name: sa.getName(),
      kind: "ServiceAccount",
      namespace: sa.getNs(),
    }));
    const users: Subject[] = Array.from(this.selectedUsers, (user) => ({
      name: user,
      kind: "User",
    }));
    const groups: Subject[] = Array.from(this.selectedGroups, (group) => ({
      name: group,
      kind: "Group",
    }));

    return [...serviceAccounts, ...users, ...groups];
  }

  @computed get roleRefOptions(): SelectOption<Role | ClusterRole>[] {
    const { roleStore, clusterRoleStore } = this.props;
    const roles = roleStore.items.filter((role) => role.getNs() === this.bindingNamespace);
    const clusterRoles = clusterRoleStore.items;

    return [...roles, ...clusterRoles].map((r) => ({
      value: r,
      label: r.getName(),
    }));
  }

  @computed get serviceAccountOptions(): SelectOption<ServiceAccount>[] {
    return this.props.serviceAccountStore.items.map((serviceAccount) => ({
      value: serviceAccount,
      label: `${serviceAccount.getName()} (${serviceAccount.getNs()})`,
      isSelected: this.selectedAccounts.has(serviceAccount),
    }));
  }

  onOpen = action(() => {
    const { roleStore, clusterRoleStore, serviceAccountStore, roleApi } = this.props;
    const binding = this.roleBinding;

    if (!binding) {
      return this.reset();
    }

    this.selectedRoleRef =
      binding.roleRef.kind === roleApi.kind
        ? roleStore.items.find((item) => item.getName() === binding.roleRef.name)
        : clusterRoleStore.items.find((item) => item.getName() === binding.roleRef.name);

    this.bindingName = binding.getName();
    this.bindingNamespace = binding.getNs();

    const [saSubjects, uSubjects, gSubjects] = iter.nFircate(binding.getSubjects(), "kind", [
      "ServiceAccount",
      "User",
      "Group",
    ]);
    const accountNames = new Set(saSubjects.map((acc) => acc.name));

    this.selectedAccounts.replace(serviceAccountStore.items.filter((sa) => accountNames.has(sa.getName())));
    this.selectedUsers.replace(uSubjects.map((user) => user.name));
    this.selectedGroups.replace(gSubjects.map((group) => group.name));
  });

  reset = action(() => {
    this.selectedRoleRef = null;
    this.bindingName = "";
    this.bindingNamespace = "";
    this.selectedAccounts.clear();
    this.selectedUsers.clear();
    this.selectedGroups.clear();
  });

  createBindings = async () => {
    const { roleBindingStore, showDetails, showCheckedErrorNotification } = this.props;
    const { selectedRoleRef, bindingNamespace, selectedBindings, roleBinding, bindingName } = this;

    if (!selectedRoleRef || !roleBinding || !bindingNamespace || !bindingName) {
      return;
    }

    try {
      const newRoleBinding = this.isEditing
        ? await roleBindingStore.updateSubjects(roleBinding, selectedBindings)
        : await roleBindingStore.create(
            {
              name: bindingName,
              namespace: bindingNamespace,
            },
            {
              subjects: selectedBindings,
              roleRef: {
                name: selectedRoleRef.getName(),
                kind: selectedRoleRef.kind,
              },
            },
          );

      showDetails(newRoleBinding.selfLink);
      this.props.closeRoleBindingDialog();
    } catch (err) {
      showCheckedErrorNotification(
        err,
        `Unknown error occurred while ${this.isEditing ? "editing" : "creating"} role bindings.`,
      );
    }
  };

  renderContents() {
    return (
      <>
        <SubTitle title="Namespace" />
        <NamespaceSelect
          id="dialog-namespace-input"
          themeName="light"
          isDisabled={this.isEditing}
          value={this.bindingNamespace}
          autoFocus={!this.isEditing}
          onChange={(opt) => (this.bindingNamespace = opt?.value ?? null)}
        />

        <SubTitle title="Role Reference" />
        <Select
          id="role-reference-input"
          themeName="light"
          placeholder="Select role or cluster role ..."
          isDisabled={this.isEditing}
          options={this.roleRefOptions}
          value={this.selectedRoleRef}
          onChange={(option) => {
            this.selectedRoleRef = option?.value;

            if (!this.selectedRoleRef || this.bindingName === this.selectedRoleRef.getName()) {
              this.bindingName = option?.value.getName() ?? "";
            }
          }}
        />

        <SubTitle title="Binding Name" />
        <Input disabled={this.isEditing} value={this.bindingName} onChange={(value) => (this.bindingName = value)} />

        <SubTitle title="Binding targets" />

        <b>Users</b>
        <EditableList
          placeholder="Bind to User Account ..."
          add={(newUser) => this.selectedUsers.add(newUser)}
          items={Array.from(this.selectedUsers)}
          remove={({ oldItem }) => this.selectedUsers.delete(oldItem)}
        />

        <b>Groups</b>
        <EditableList
          placeholder="Bind to User Group ..."
          add={(newGroup) => this.selectedGroups.add(newGroup)}
          items={Array.from(this.selectedGroups)}
          remove={({ oldItem }) => this.selectedGroups.delete(oldItem)}
        />

        <b>Service Accounts</b>
        <Select
          id="service-account-input"
          isMulti
          themeName="light"
          placeholder="Select service accounts ..."
          options={this.serviceAccountOptions}
          formatOptionLabel={(option) => (
            <>
              <Icon small material="account_box" /> {option.label}
            </>
          )}
          onChange={onMultiSelectFor(this.selectedAccounts)}
          maxMenuHeight={200}
        />
      </>
    );
  }

  render() {
    const { closeRoleBindingDialog, roleBindingStore, state, ...dialogProps } = this.props;
    const [action, nextLabel] = this.isEditing ? ["Edit", "Update"] : ["Add", "Create"];
    const disableNext =
      !this.selectedRoleRef || !this.selectedBindings.length || !this.bindingNamespace || !this.bindingName;

    void roleBindingStore;

    return (
      <Dialog
        {...dialogProps}
        className="AddRoleBindingDialog"
        isOpen={state.get().isOpen}
        close={closeRoleBindingDialog}
        onClose={this.reset}
        onOpen={this.onOpen}
      >
        <Wizard header={<h5>{`${action} RoleBinding`}</h5>} done={closeRoleBindingDialog}>
          <WizardStep nextLabel={nextLabel} next={this.createBindings} disabledNext={disableNext}>
            {this.renderContents()}
          </WizardStep>
        </Wizard>
      </Dialog>
    );
  }
}

export const RoleBindingDialog = withInjectables<Dependencies, RoleBindingDialogProps>(NonInjectedRoleBindingDialog, {
  getProps: (di, props) => ({
    ...props,
    roleBindingStore: di.inject(roleBindingStoreInjectable),
    state: di.inject(roleBindingDialogStateInjectable),
    closeRoleBindingDialog: di.inject(closeRoleBindingDialogInjectable),
    showDetails: di.inject(showDetailsInjectable),
    clusterRoleStore: di.inject(clusterRoleStoreInjectable),
    roleStore: di.inject(roleStoreInjectable),
    serviceAccountStore: di.inject(serviceAccountStoreInjectable),
    roleApi: di.inject(roleApiInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
  }),
});
