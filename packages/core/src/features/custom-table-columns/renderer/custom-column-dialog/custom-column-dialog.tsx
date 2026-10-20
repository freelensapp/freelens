/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import { formatJSONValue, isValidJSONPath, safeJSONPathValue } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { action, computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Dialog } from "../../../../renderer/components/dialog";
import { Input } from "../../../../renderer/components/input";
import { inputValidator } from "../../../../renderer/components/input/input_validators";
import { SubTitle } from "../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../renderer/components/select";
import addCustomTableColumnInjectable from "../../common/add-custom-table-column.injectable";
import customTableColumnsInjectable from "../../common/custom-table-columns.injectable";
import removeCustomTableColumnInjectable from "../../common/remove-custom-table-column.injectable";
import updateCustomTableColumnInjectable from "../../common/update-custom-table-column.injectable";
import styles from "./custom-column-dialog.module.scss";
import customColumnDialogStateInjectable from "./state.injectable";

import type { IComputedValue, IObservableValue } from "mobx";

import type { AddCustomTableColumn } from "../../common/add-custom-table-column.injectable";
import type { CustomTableColumn } from "../../common/custom-table-column";
import type { RemoveCustomTableColumn } from "../../common/remove-custom-table-column.injectable";
import type { UpdateCustomTableColumn } from "../../common/update-custom-table-column.injectable";
import type { CustomColumnDialogParams } from "./state.injectable";

/**
 * How many rows of the list the preview evaluates the expression against.
 */
const previewSize = 5;

const atTheEnd = "";

const jsonPathValidator = inputValidator({
  message: () => "Not a valid JSONPath expression",
  validate: (value) => value.length === 0 || isValidJSONPath(value),
});

interface Dependencies {
  state: IObservableValue<CustomColumnDialogParams | undefined>;
  customColumns: IComputedValue<CustomTableColumn[]>;
  addColumn: AddCustomTableColumn;
  updateColumn: UpdateCustomTableColumn;
  removeColumn: RemoveCustomTableColumn;
}

@observer
class NonInjectedCustomColumnDialog extends React.Component<Dependencies> {
  @observable editingId: string | undefined;
  @observable title = "";
  @observable jsonPath = "";
  @observable after = atTheEnd;

  constructor(props: Dependencies) {
    super(props);
    makeObservable(this);
    autoBindReact(this);
  }

  // Plain getter (not @computed): reads this.props, which mobx-react 9 forbids inside a
  // derivation. Read from render, reactivity is preserved by the observer render reaction.
  get params() {
    return this.props.state.get();
  }

  get columnsOfThisResource(): CustomTableColumn[] {
    const params = this.params;

    if (!params) {
      return [];
    }

    return this.props.customColumns
      .get()
      .filter((column) => column.kind === params.kind && [column.apiVersion].flat().includes(params.apiVersion));
  }

  @computed get canSave() {
    return this.title.trim().length > 0 && this.jsonPath.trim().length > 0 && isValidJSONPath(this.jsonPath.trim());
  }

  @action
  close() {
    this.props.state.set(undefined);
  }

  @action
  reset() {
    this.editingId = undefined;
    this.title = "";
    this.jsonPath = "";
    this.after = atTheEnd;
  }

  @action
  edit(column: CustomTableColumn) {
    this.editingId = column.id;
    this.title = column.title;
    this.jsonPath = column.jsonPath;
    this.after = column.after ?? atTheEnd;
  }

  @action
  save() {
    if (!this.canSave) {
      return;
    }

    const params = this.params;

    if (!params) {
      return;
    }

    const changes = {
      title: this.title.trim(),
      jsonPath: this.jsonPath.trim(),
      after: this.after === atTheEnd ? undefined : this.after,
    };

    if (this.editingId) {
      this.props.updateColumn(this.editingId, changes);
    } else {
      this.props.addColumn({ ...changes, kind: params.kind, apiVersion: params.apiVersion });
    }

    this.close();
  }

  @action
  remove(column: CustomTableColumn) {
    this.props.removeColumn(column.id);

    if (this.editingId === column.id) {
      this.reset();
    }
  }

  renderPreview() {
    const params = this.params;

    if (!params) {
      return null;
    }

    const expression = this.jsonPath.trim();
    const items = params.getPreviewItems().slice(0, previewSize);

    if (items.length === 0) {
      return <div className={styles.previewEmpty}>This list has no items to preview against.</div>;
    }

    if (expression.length === 0) {
      return <div className={styles.previewEmpty}>Type an expression to see what it produces.</div>;
    }

    return (
      <div className={styles.preview} data-testid="custom-column-preview">
        {items.map((item) => {
          const value = formatJSONValue(safeJSONPathValue(item, expression));

          return (
            <div className={styles.previewRow} key={item.getId()}>
              <div className={styles.previewName} title={item.getName()}>
                {item.getName()}
              </div>
              <div className={value ? styles.previewValue : styles.previewEmpty} title={value}>
                {value || "no value"}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  renderExistingColumns() {
    const columns = this.columnsOfThisResource;

    if (columns.length === 0) {
      return null;
    }

    return (
      <>
        <SubTitle title="Columns you have added" />
        <div data-testid="custom-column-list">
          {columns.map((column) => (
            <div className={styles.existing} key={column.id}>
              <div className={styles.existingTitle}>
                {column.title} <span className={styles.existingPath}>{column.jsonPath}</span>
              </div>
              <div className="flex gap-2 items-center">
                <Icon
                  material="edit"
                  small
                  interactive
                  tooltip="Edit"
                  data-testid={`edit-custom-column-${column.id}`}
                  onClick={() => this.edit(column)}
                />
                <Icon
                  material="delete"
                  small
                  interactive
                  tooltip="Remove"
                  data-testid={`remove-custom-column-${column.id}`}
                  onClick={() => this.remove(column)}
                />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  render() {
    const params = this.params;
    const anchorOptions = [
      { value: atTheEnd, label: "At the end" },
      ...(params?.anchors ?? [])
        .filter((anchor) => anchor.id !== this.editingId)
        .map((anchor) => ({ value: anchor.id, label: `After ${anchor.title}` })),
    ];

    return (
      <Dialog
        className={styles.dialog}
        isOpen={Boolean(params)}
        close={this.close}
        onClose={this.reset}
        data-testid="custom-column-dialog"
      >
        <div className="flex flex-col gap-4 p-6">
          <h5>{this.editingId ? "Edit column" : `Add a column to ${params?.kind ?? "this list"}`}</h5>

          <div>
            <SubTitle title="Name" />
            <Input
              autoFocus
              required
              placeholder="Instance type"
              value={this.title}
              onChange={(value) => (this.title = value)}
            />
          </div>

          <div>
            <SubTitle title="JSONPath" />
            <Input
              required
              placeholder=".metadata.labels['node.kubernetes.io/instance-type']"
              value={this.jsonPath}
              validators={jsonPathValidator}
              onChange={(value) => (this.jsonPath = value)}
            />
          </div>

          <div>
            <SubTitle title="Position" />
            <Select
              id="custom-column-position-select"
              options={anchorOptions}
              value={this.after}
              isSearchable={false}
              onChange={(option) => (this.after = option?.value ?? atTheEnd)}
            />
          </div>

          <div>
            <SubTitle title="Preview" />
            {this.renderPreview()}
          </div>

          {this.renderExistingColumns()}

          <div className="flex gap-2 justify-end">
            <Button plain label="Cancel" onClick={this.close} />
            <Button
              primary
              label={this.editingId ? "Save" : "Add"}
              disabled={!this.canSave}
              data-testid="save-custom-column"
              onClick={this.save}
            />
          </div>
        </div>
      </Dialog>
    );
  }
}

export const CustomColumnDialog = withInjectables<Dependencies>(NonInjectedCustomColumnDialog, {
  getProps: (di) => ({
    state: di.inject(customColumnDialogStateInjectable),
    customColumns: di.inject(customTableColumnsInjectable),
    addColumn: di.inject(addCustomTableColumnInjectable),
    updateColumn: di.inject(updateCustomTableColumnInjectable),
    removeColumn: di.inject(removeCustomTableColumnInjectable),
  }),
});
