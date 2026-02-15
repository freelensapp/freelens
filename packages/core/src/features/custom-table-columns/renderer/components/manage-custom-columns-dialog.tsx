/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./manage-custom-columns-dialog.scss";

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { action, computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { Dialog } from "../../../../renderer/components/dialog";
import { Input } from "../../../../renderer/components/input";
import manageCustomColumnsDialogStateInjectable from "./manage-custom-columns-dialog-state.injectable";
import customColumnsStorageInjectable from "../custom-columns-storage.injectable";

import type { ShowNotification } from "@freelensapp/notifications";
import type { IObservableValue } from "mobx";
import type { DialogProps } from "../../../../renderer/components/dialog";
import type { ManageCustomColumnsDialogState } from "./manage-custom-columns-dialog-state.injectable";
import type { CustomColumnConfig, CustomColumnsStorageState } from "../../common/custom-column-config";
import type { StorageLayer } from "../../../../renderer/utils/storage-helper";

export interface ManageCustomColumnsDialogProps extends Partial<DialogProps> {}

interface Dependencies {
  state: IObservableValue<ManageCustomColumnsDialogState | undefined>;
  storage: StorageLayer<CustomColumnsStorageState>;
  showErrorNotification: ShowNotification;
}

@observer
class NonInjectedManageCustomColumnsDialog extends Component<ManageCustomColumnsDialogProps & Dependencies> {
  @observable newPath = "";
  @observable newTitle = "";

  constructor(props: ManageCustomColumnsDialogProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  @computed get dialogState() {
    return this.props.state.get();
  }

  @computed get tableId() {
    return this.dialogState?.tableId;
  }

  @computed get existingColumns(): CustomColumnConfig[] {
    if (!this.tableId) return [];

    const storageState = this.props.storage.get();

    return storageState[this.tableId] || [];
  }

  close = () => {
    this.props.state.set(undefined);
  };

  onOpen = () => {
    this.newPath = "";
    this.newTitle = "";
  };

  @action
  setNewPath = (value: string) => {
    this.newPath = value;
  };

  @action
  setNewTitle = (value: string) => {
    this.newTitle = value;
  };

  addColumn = () => {
    const { tableId } = this;

    if (!tableId) return;

    const path = this.newPath.trim();

    if (!path) {
      this.props.showErrorNotification("Path cannot be empty");

      return;
    }

    // Check for duplicate
    if (this.existingColumns.some((col) => col.path === path)) {
      this.props.showErrorNotification(`Column with path "${path}" already exists`);

      return;
    }

    const newColumn: CustomColumnConfig = {
      path,
      title: this.newTitle.trim() || undefined,
    };

    const storageState = this.props.storage.get();
    const updatedColumns = [...(storageState[tableId] || []), newColumn];

    this.props.storage.set({
      ...storageState,
      [tableId]: updatedColumns,
    });

    // Reset form
    this.newPath = "";
    this.newTitle = "";
  };

  removeColumn = (path: string) => {
    const { tableId } = this;

    if (!tableId) return;

    const storageState = this.props.storage.get();
    const updatedColumns = (storageState[tableId] || []).filter((col) => col.path !== path);

    this.props.storage.set({
      ...storageState,
      [tableId]: updatedColumns,
    });
  };

  render() {
    const { dialogState } = this;
    const isOpen = !!dialogState;

    return (
      <Dialog
        isOpen={isOpen}
        close={this.close}
        onOpen={this.onOpen}
        className="ManageCustomColumnsDialog"
        data-testid="manage-custom-columns-dialog"
      >
        {isOpen && (
          <div className="dialog-content">
            <div className="dialog-header">
              <h5>Manage Custom Columns</h5>
              <p className="dialog-subtitle">
                {"Add custom columns by specifying a field path. For keys containing dots, use bracket notation: metadata.annotations['my.dotted.key']"}
              </p>
            </div>

            <div className="add-column-form">
              <div className="form-row">
                <Input
                  placeholder="e.g., status.phase or metadata.annotations['my.key']"
                  value={this.newPath}
                  onChange={this.setNewPath}
                  data-testid="custom-column-path-input"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <Input
                  placeholder="Display title (optional)"
                  value={this.newTitle}
                  onChange={this.setNewTitle}
                  data-testid="custom-column-title-input"
                />
              </div>
              <div className="form-row">
                <Button
                  primary
                  label="Add Column"
                  onClick={this.addColumn}
                  data-testid="add-custom-column-button"
                />
              </div>
            </div>

            {this.existingColumns.length > 0 && (
              <div className="existing-columns">
                <h6>Existing Custom Columns</h6>
                <div className="columns-list">
                  {this.existingColumns.map((col) => (
                    <div key={col.path} className="column-item" data-testid={`custom-column-${col.path}`}>
                      <div className="column-info">
                        <div className="column-title">{col.title || col.path}</div>
                        {col.title && <div className="column-path">{col.path}</div>}
                      </div>
                      <Icon
                        material="delete"
                        className="remove-icon"
                        onClick={() => this.removeColumn(col.path)}
                        data-testid={`remove-custom-column-${col.path}`}
                        tooltip="Remove column"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="dialog-actions">
              <Button label="Close" onClick={this.close} data-testid="close-dialog-button" />
            </div>
          </div>
        )}
      </Dialog>
    );
  }
}

export const ManageCustomColumnsDialog = withInjectables<Dependencies, ManageCustomColumnsDialogProps>(
  NonInjectedManageCustomColumnsDialog,
  {
    getProps: (di, props) => ({
      ...props,
      state: di.inject(manageCustomColumnsDialogStateInjectable),
      storage: di.inject(customColumnsStorageInjectable),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
    }),
  },
);
