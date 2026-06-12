/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./details.scss";

import { ObservableHashSet, prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { AddRemoveButtons } from "../../add-remove-buttons";
import openConfirmDialogInjectable from "../../confirm-dialog/open.injectable";
import { DrawerTitle } from "../../drawer";
import { LinkToNamespace, LinkToRole, LinkToServiceAccount } from "../../kube-object-link";
import { Table, TableCell, TableHead, TableRow } from "../../table";
import { WithTooltip } from "../../with-tooltip";
import { hashSubject } from "../hashers";
import openRoleBindingDialogInjectable from "./dialog/open.injectable";
import roleBindingStoreInjectable from "./store.injectable";

import type { RoleBinding } from "@freelensapp/kube-object";

import type { OpenConfirmDialog } from "../../confirm-dialog/open.injectable";
import type { KubeObjectDetailsProps } from "../../kube-object-details";
import type { OpenRoleBindingDialog } from "./dialog/open.injectable";
import type { RoleBindingStore } from "./store";

export interface RoleBindingDetailsProps extends KubeObjectDetailsProps<RoleBinding> {}

interface Dependencies {
  openConfirmDialog: OpenConfirmDialog;
  openRoleBindingDialog: OpenRoleBindingDialog;
  roleBindingStore: RoleBindingStore;
}

@observer
class NonInjectedRoleBindingDetails extends React.Component<RoleBindingDetailsProps & Dependencies> {
  private readonly selectedSubjects = new ObservableHashSet([], hashSubject);

  async componentDidMount() {
    disposeOnUnmount(this, [
      reaction(
        () => this.props.object,
        () => {
          this.selectedSubjects.clear();
        },
      ),
    ]);
  }

  removeSelectedSubjects = () => {
    const { object: roleBinding, openConfirmDialog, roleBindingStore } = this.props;
    const { selectedSubjects } = this;

    openConfirmDialog({
      ok: () => roleBindingStore.removeSubjects(roleBinding, selectedSubjects.toJSON()),
      labelOk: `Remove`,
      message: (
        <p>
          Remove selected bindings for
          <b>{roleBinding.getName()}</b>?
        </p>
      ),
    });
  };

  render() {
    const { selectedSubjects } = this;
    const { object: roleBinding, openRoleBindingDialog } = this.props;

    if (!roleBinding) {
      return null;
    }
    const { roleRef } = roleBinding;
    const subjects = roleBinding.getSubjects();
    const namespace = roleBinding.getNs();

    return (
      <div className="RoleBindingDetails">
        <DrawerTitle>Reference</DrawerTitle>
        <Table>
          <TableHead>
            <TableCell>Kind</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>API Group</TableCell>
          </TableHead>
          <TableRow>
            <TableCell>
              <WithTooltip>{roleRef.kind}</WithTooltip>
            </TableCell>
            <TableCell>
              <LinkToRole name={roleRef.name} namespace={namespace} />
            </TableCell>
            <TableCell>
              <WithTooltip>{roleRef.apiGroup}</WithTooltip>
            </TableCell>
          </TableRow>
        </Table>

        <DrawerTitle>Bindings</DrawerTitle>
        {subjects.length > 0 && (
          <Table selectable className="bindings box grow">
            <TableHead>
              <TableCell checkbox />
              <TableCell className="type">Type</TableCell>
              <TableCell className="binding">Name</TableCell>
              <TableCell className="ns">Namespace</TableCell>
            </TableHead>
            {subjects.map((subject, i) => {
              const { kind, name, namespace } = subject;
              const isSelected = selectedSubjects.has(subject);

              return (
                <TableRow
                  key={i}
                  selected={isSelected}
                  onClick={prevDefault(() => this.selectedSubjects.toggle(subject))}
                >
                  <TableCell checkbox isChecked={isSelected} />
                  <TableCell className="type">
                    <WithTooltip>{kind}</WithTooltip>
                  </TableCell>
                  <TableCell className="binding">
                    {kind === "ServiceAccount" ? <LinkToServiceAccount name={name} namespace={namespace} /> : name}
                  </TableCell>
                  <TableCell className="ns">
                    <LinkToNamespace namespace={namespace} />
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        )}

        <AddRemoveButtons
          onAdd={() => openRoleBindingDialog(roleBinding)}
          onRemove={selectedSubjects.size ? this.removeSelectedSubjects : undefined}
          addTooltip={`Edit bindings of ${roleRef.name}`}
          removeTooltip={`Remove selected bindings from ${roleRef.name}`}
        />
      </div>
    );
  }
}

export const RoleBindingDetails = withInjectables<Dependencies, RoleBindingDetailsProps>(
  NonInjectedRoleBindingDetails,
  {
    getProps: (di, props) => ({
      ...props,
      openConfirmDialog: di.inject(openConfirmDialogInjectable),
      openRoleBindingDialog: di.inject(openRoleBindingDialogInjectable),
      roleBindingStore: di.inject(roleBindingStoreInjectable),
    }),
  },
);
