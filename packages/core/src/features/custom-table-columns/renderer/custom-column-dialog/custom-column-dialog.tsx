/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames, formatJSONValue, isValidJSONPath, safeJSONPathValue } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { action, computed, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Dialog } from "../../../../renderer/components/dialog";
import { Input } from "../../../../renderer/components/input";
import { inputValidator } from "../../../../renderer/components/input/input_validators";
import { SubTitle } from "../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../renderer/components/select";
import { Wizard, WizardStep } from "../../../../renderer/components/wizard";
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
 * How many rows the preview shows.
 */
const previewSize = 5;

/**
 * How far into the list the preview looks for items the expression produces a value for. Bounded
 * because this runs on every keystroke, and a list can hold thousands of items.
 */
const previewScanLimit = 200;

const atTheEnd = "";

const jsonPathValidator = inputValidator({
  message: () => "Not a valid JSONPath expression",
  validate: (value) => value.length === 0 || isValidJSONPath(value),
});

interface PreviewRow {
  id: string;
  name: string;
  value: string;
}

interface Preview {
  rows: PreviewRow[];
  caption: string;
}

interface Dependencies {
  state: IObservableValue<CustomColumnDialogParams | undefined>;
  customColumns: IComputedValue<CustomTableColumn[]>;
  addColumn: AddCustomTableColumn;
  updateColumn: UpdateCustomTableColumn;
  removeColumn: RemoveCustomTableColumn;
}

@observer
class NonInjectedCustomColumnDialog extends React.Component<Dependencies> {
  @observable accessor editingId: string | undefined;
  @observable accessor title = "";
  @observable accessor jsonPath = "";
  @observable accessor after = atTheEnd;

  /**
   * The preview rows the reader has opened up, by item id. A value is shown on one line so that
   * five of them stay readable, which is not enough for a long one.
   */
  readonly expandedRows = observable.set<string>();

  constructor(props: Dependencies) {
    super(props);
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
    this.expandedRows.clear();
  }

  @action
  toggleRow(id: string) {
    if (!this.expandedRows.delete(id)) {
      this.expandedRows.add(id);
    }
  }

  /**
   * The rows to preview against.
   *
   * An expression is usually written for a value only some of the items carry, and the first few
   * items of the list are rarely those. So the items the expression produces a value for are
   * preferred, and the rest of the room is filled with items it does not, which is what tells the
   * reader the expression is matching something rather than everything.
   */
  getPreview(params: CustomColumnDialogParams): Preview {
    const items = params.getPreviewItems();
    const expression = this.jsonPath.trim();

    // The caption is always there, even before there is anything to count, so that typing the first
    // character of an expression does not add a line and push the dialog open.
    if (expression.length === 0) {
      const rows = items.slice(0, previewSize);

      return {
        rows: rows.map((item) => ({ id: item.getId(), name: item.getName(), value: "" })),
        caption: `${rows.length} of ${items.length} ${items.length === 1 ? "item" : "items"}`,
      };
    }

    const scanned = items.slice(0, previewScanLimit);
    const withValue: PreviewRow[] = [];
    const withoutValue: PreviewRow[] = [];

    for (const item of scanned) {
      const row = {
        id: item.getId(),
        name: item.getName(),
        value: formatJSONValue(safeJSONPathValue(item, expression)),
      };

      if (row.value) {
        withValue.push(row);
      } else if (withoutValue.length < previewSize) {
        withoutValue.push(row);
      }
    }

    const scannedNote = items.length > scanned.length ? `the first ${scanned.length}` : `${scanned.length}`;

    return {
      rows: [...withValue, ...withoutValue].slice(0, previewSize),
      caption: `${withValue.length} of ${scannedNote} items have a value`,
    };
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

    const hasExpression = this.jsonPath.trim().length > 0;
    const { rows, caption } = this.getPreview(params);

    if (rows.length === 0) {
      return <div className={styles.previewEmpty}>This list has no items to preview against.</div>;
    }

    // The number of rows does not change with the expression, so the dialog does not resize under
    // the pointer while it is being typed. An opened row grows inside the scrolling box instead.
    return (
      <>
        <div className={styles.preview} data-testid="custom-column-preview">
          {rows.map((row) => {
            const expanded = this.expandedRows.has(row.id);

            return (
              <div
                className={cssNames(styles.previewRow, { [styles.previewRowExpanded]: expanded })}
                key={row.id}
                role="button"
                tabIndex={0}
                title={expanded ? undefined : "Click to read in full"}
                onClick={() => this.toggleRow(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this.toggleRow(row.id);
                  }
                }}
              >
                <div className={styles.previewName}>{row.name}</div>
                <div className={row.value ? styles.previewValue : styles.previewEmpty}>
                  {row.value || (hasExpression ? "no value" : "waiting for an expression")}
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.previewCaption}>{caption}</div>
      </>
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
                <span className={styles.existingName}>{column.title}</span>
                <span className={styles.existingPath} title={column.jsonPath}>
                  {column.jsonPath}
                </span>
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
        <Wizard
          header={<h5>{this.editingId ? "Edit column" : `Add a column to ${params?.kind ?? "this list"}`}</h5>}
          done={this.close}
        >
          <WizardStep
            contentClass="flex gap-4 flex-col"
            nextLabel={this.editingId ? "Save" : "Add"}
            next={this.save}
            disabledNext={!this.canSave}
            testIdForNext="save-custom-column"
          >
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
          </WizardStep>
        </Wizard>
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
