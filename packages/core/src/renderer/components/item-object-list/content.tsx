/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./item-list-layout.scss";

import { Spinner } from "@freelensapp/spinner";
import { cssNames, isDefined, isReactNode, noop, prevDefault, stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { action, computed, makeObservable, observable } from "mobx";
import { Observer, observer } from "mobx-react";
import React from "react";
import isTableColumnHiddenInjectable from "../../../features/user-preferences/common/is-table-column-hidden.injectable";
import toggleTableColumnVisibilityInjectable from "../../../features/user-preferences/common/toggle-table-column-visibility.injectable";
import { allowDelete } from "../../../features/user-preferences/common/allow-delete";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import activeThemeInjectable from "../../themes/active.injectable";
import { AddRemoveButtons } from "../add-remove-buttons";
import { Checkbox } from "../checkbox";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import { MenuItem } from "../menu";
import { MenuActions } from "../menu/menu-actions";
import { NoItems } from "../no-items";
import { Table, TableCell, TableHead, TableRow } from "../table";
import columnResizeStorageInjectable from "./column-resize-storage/storage.injectable";
import pageFiltersStoreInjectable from "./page-filters/store.injectable";

import type { ItemObject, TableCellProps } from "@freelensapp/list-layout";
import type { IClassName, StrictReactNode } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { IsTableColumnHidden } from "../../../features/user-preferences/common/is-table-column-hidden.injectable";
import type { ToggleTableColumnVisibility } from "../../../features/user-preferences/common/toggle-table-column-visibility.injectable";
import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { LensTheme } from "../../themes/lens-theme";
import type { StorageLayer } from "../../utils/storage-helper";
import type { AddRemoveButtonsProps } from "../add-remove-buttons";
import type { ConfirmDialogParams } from "../confirm-dialog";
import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import type { TableProps, TableRowProps, TableSortCallbacks } from "../table";
import type { ColumnResizeStorageState } from "./column-resize-storage/storage.injectable";
import type { ItemListStore } from "./list-layout";
import type { Filter, PageFiltersStore } from "./page-filters/store";

interface ResizeState {
  columnId: string;
  startX: number;
  tableWidth: number;
  initialFlexGrowValues: Map<string, number>;
  initialColumnRight: number;
}

export interface ItemListLayoutContentProps<Item extends ItemObject, PreLoadStores extends boolean> {
  getFilters: () => Filter[];
  tableId?: string;
  className: IClassName;
  getItems: () => Item[];
  store: ItemListStore<Item, PreLoadStores>;
  getIsReady: () => boolean; // show loading indicator while not ready
  isSelectable?: boolean; // show checkbox in rows for selecting items
  isConfigurable?: boolean;
  copyClassNameFromHeadCells?: boolean;
  sortingCallbacks?: TableSortCallbacks<Item>;
  tableProps?: Partial<TableProps<Item>>; // low-level table configuration
  renderTableHeader?: (TableCellProps | undefined | null)[];
  renderTableContents: (item: Item) => (StrictReactNode | TableCellProps)[];
  renderItemMenu?: (item: Item, store: ItemListStore<Item, PreLoadStores>) => StrictReactNode;
  customizeTableRowProps?: (item: Item) => Partial<TableRowProps<Item>>;
  addRemoveButtons?: Partial<AddRemoveButtonsProps>;
  virtual?: boolean;

  // item details view
  hasDetailsView?: boolean;
  detailsItem?: Item;
  onDetails?: (item: Item) => void;

  // other
  customizeRemoveDialog?: (selectedItems: Item[]) => Partial<ConfirmDialogParams>;

  spinnerTestId?: string;

  /**
   * Message to display when a store failed to load
   *
   * @default "Failed to load items"
   */
  failedToLoadMessage?: StrictReactNode;
}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
  pageFiltersStore: PageFiltersStore;
  openConfirmDialog: OpenConfirmDialog;
  toggleTableColumnVisibility: ToggleTableColumnVisibility;
  isTableColumnHidden: IsTableColumnHidden;
  columnResizeStorage: StorageLayer<ColumnResizeStorageState>;
  userPreferencesState: UserPreferencesState;
}

@observer
export class NonInjectedItemListLayoutContent<
  Item extends ItemObject,
  PreLoadStores extends boolean,
> extends React.Component<ItemListLayoutContentProps<Item, PreLoadStores> & Dependencies> {
  private resizeState: ResizeState | null = null;
  private tableRef = React.createRef<HTMLDivElement>();
  private resizeGuideRef = React.createRef<HTMLDivElement>();

  @observable private columnFlexGrow = new Map<string, number>();
  @observable private resizeGuideX: number | null = null;

  constructor(props: ItemListLayoutContentProps<Item, PreLoadStores> & Dependencies) {
    super(props);
    makeObservable(this);
    autoBindReact(this);
    this.loadSavedColumnWidths();
  }

  componentWillUnmount() {
    this.cleanupResizeListeners();
  }

  @action
  private loadSavedColumnWidths() {
    const { tableId, columnResizeStorage } = this.props;
    if (!tableId) return;

    const savedState = columnResizeStorage.get();
    const tableState = savedState[tableId];

    if (tableState) {
      Object.entries(tableState).forEach(([columnId, flexGrow]) => {
        this.columnFlexGrow.set(columnId, flexGrow);
      });
    }
  }

  @action
  private handleResizeReset(columnId: string) {
    const { tableId, columnResizeStorage } = this.props;

    this.columnFlexGrow.delete(columnId);

    if (tableId) {
      const savedState = columnResizeStorage.get();
      const tableState = savedState[tableId] || {};
      delete tableState[columnId];
      columnResizeStorage.merge({ [tableId]: tableState });
    }
  }

  private handleResizeStart(columnId: string, event: MouseEvent) {
    const tableElement = this.tableRef.current;
    if (!tableElement) return;

    const headers = this.getVisibleHeaders();
    const initialFlexGrowValues = new Map<string, number>();
    headers.forEach((header) => {
      if (header.id) {
        initialFlexGrowValues.set(header.id, this.getColumnFlexGrow(header));
      }
    });

    const headerCell = tableElement.querySelector(`.TableHead .TableCell[id="${columnId}"]`) as HTMLElement;

    if (!headerCell) return;

    const tableRect = tableElement.getBoundingClientRect();
    const headerRect = headerCell.getBoundingClientRect();
    const initialColumnRight = headerRect.right - tableRect.left;

    this.resizeState = {
      columnId,
      startX: event.clientX,
      tableWidth: tableElement.offsetWidth,
      initialFlexGrowValues,
      initialColumnRight,
    };

    this.resizeGuideX = initialColumnRight;

    document.addEventListener("mousemove", this.handleResizeMove);
    document.addEventListener("mouseup", this.handleResizeEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  @action
  private handleResizeMove(event: MouseEvent) {
    if (!this.resizeState) return;

    const { columnId, startX, tableWidth, initialFlexGrowValues } = this.resizeState;
    const deltaX = event.clientX - startX;

    const headers = this.getVisibleHeaders();
    const totalInitialFlexGrow = Array.from(initialFlexGrowValues.values()).reduce((sum, val) => sum + val, 0);
    const pixelsPerFlexUnit = tableWidth / totalInitialFlexGrow;
    const deltaFlexGrow = deltaX / pixelsPerFlexUnit;

    const initialCurrentFlexGrow = initialFlexGrowValues.get(columnId);
    if (!initialCurrentFlexGrow) return;

    const newCurrentFlexGrow = Math.max(0.3, initialCurrentFlexGrow + deltaFlexGrow);
    this.columnFlexGrow.set(columnId, newCurrentFlexGrow);

    requestAnimationFrame(() => {
      const tableElement = this.tableRef.current;
      if (tableElement) {
        const headerCell = tableElement.querySelector(`.TableHead .TableCell[id="${columnId}"]`) as HTMLElement;
        if (headerCell) {
          const tableRect = tableElement.getBoundingClientRect();
          const headerRect = headerCell.getBoundingClientRect();
          const actualColumnRight = headerRect.right - tableRect.left;

          this.resizeGuideX = actualColumnRight;
        }
      }
    });

    const otherColumns = headers.filter((h) => h.id && h.id !== columnId);
    const totalOtherInitialFlexGrow = otherColumns.reduce((sum, h) => sum + (initialFlexGrowValues.get(h.id!) || 0), 0);

    if (totalOtherInitialFlexGrow > 0) {
      otherColumns.forEach((col) => {
        if (!col.id) return;
        const initialFlexGrow = initialFlexGrowValues.get(col.id) || 0;
        const proportion = initialFlexGrow / totalOtherInitialFlexGrow;
        const adjustment = deltaFlexGrow * proportion;
        const newFlexGrow = Math.max(0.3, initialFlexGrow - adjustment);
        this.columnFlexGrow.set(col.id, newFlexGrow);
      });
    }
  }

  @action
  private handleResizeEnd() {
    const { tableId, columnResizeStorage } = this.props;

    if (tableId && this.resizeState) {
      const savedState = columnResizeStorage.get();
      const tableState = savedState[tableId] || {};

      this.columnFlexGrow.forEach((flexGrow, columnId) => {
        tableState[columnId] = Math.round(flexGrow * 100) / 100;
      });

      columnResizeStorage.merge({ [tableId]: tableState });
    }

    this.cleanupResizeListeners();
    this.resizeState = null;
    this.resizeGuideX = null;
  }

  private cleanupResizeListeners() {
    document.removeEventListener("mousemove", this.handleResizeMove);
    document.removeEventListener("mouseup", this.handleResizeEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  private getVisibleHeaders(): (TableCellProps & { id: string })[] {
    const { renderTableHeader = [] } = this.props;
    const nonResizableIds = new Set(["checkbox", "logs", "menu"]);

    return renderTableHeader
      .filter(isDefined)
      .filter((h) => this.showColumn(h))
      .filter((h): h is TableCellProps & { id: string } => !!h.id && !nonResizableIds.has(h.id));
  }

  private getColumnFlexGrow(header: TableCellProps): number {
    if (header.id && this.columnFlexGrow.has(header.id)) {
      return this.columnFlexGrow.get(header.id)!;
    }
    return this.getDefaultFlexGrow(header);
  }

  private getDefaultFlexGrow(header: TableCellProps): number {
    if (!header.id || !this.tableRef.current) return 1;

    const headerCell = this.tableRef.current.querySelector(`.TableHead .TableCell[id="${header.id}"]`) as HTMLElement;

    if (!headerCell) return 1;

    const computedStyle = window.getComputedStyle(headerCell);
    const flexGrow = computedStyle.flexGrow;

    return flexGrow ? parseFloat(flexGrow) : 1;
  }

  @computed get failedToLoad() {
    return this.props.store.failedLoading;
  }

  renderRow(item: Item) {
    return this.getTableRow(item);
  }

  getTableRow(item: Item) {
    const {
      isSelectable,
      renderTableHeader,
      renderTableContents,
      renderItemMenu,
      store,
      hasDetailsView,
      onDetails,
      copyClassNameFromHeadCells,
      customizeTableRowProps = () => ({}),
      detailsItem,
    } = this.props;
    const { isSelected } = store;

    return (
      <TableRow
        nowrap
        searchItem={item}
        sortItem={item}
        selected={detailsItem && detailsItem.getId() === item.getId()}
        onClick={hasDetailsView ? prevDefault(() => onDetails?.(item)) : undefined}
        {...customizeTableRowProps(item)}
      >
        {isSelectable && (
          <TableCell checkbox isChecked={isSelected(item)} onClick={prevDefault(() => store.toggleSelection(item))} />
        )}
        {renderTableContents(item).map((content, index) => {
          const cellProps: TableCellProps = isReactNode(content) ? { children: content } : content;
          const headCell = renderTableHeader?.[index];

          if (copyClassNameFromHeadCells && headCell) {
            cellProps.className = cssNames(cellProps.className, headCell.className);
          }

          if (!headCell || this.showColumn(headCell)) {
            return (
              <TableCell
                key={index}
                {...cellProps}
                style={{
                  ...cellProps.style,
                  flex:
                    headCell?.id && this.columnFlexGrow.has(headCell.id)
                      ? `${this.columnFlexGrow.get(headCell.id)} 0`
                      : cellProps.style?.flex,
                }}
              />
            );
          }

          return null;
        })}
        {renderItemMenu && (
          <TableCell className="menu">
            <div onClick={stopPropagation}>{renderItemMenu(item, store)}</div>
          </TableCell>
        )}
      </TableRow>
    );
  }

  getRow(uid: string) {
    return (
      <div key={uid}>
        <Observer>
          {() => {
            const item = this.props.getItems().find((item) => item.getId() === uid);

            if (!item) return null;

            return this.getTableRow(item);
          }}
        </Observer>
      </div>
    );
  }

  removeItemsDialog(selectedItems: Item[]) {
    const { customizeRemoveDialog, store, openConfirmDialog } = this.props;
    const visibleMaxNamesCount = 5;
    const selectedNames = selectedItems
      .map((ns) => ns.getName())
      .slice(0, visibleMaxNamesCount)
      .join(", ");
    const dialogCustomProps = customizeRemoveDialog ? customizeRemoveDialog(selectedItems) : {};
    const selectedCount = selectedItems.length;
    const tailCount = selectedCount > visibleMaxNamesCount ? selectedCount - visibleMaxNamesCount : 0;
    const tail =
      tailCount > 0 ? (
        <>
          {", and "}
          <b>{tailCount}</b>
          {" more"}
        </>
      ) : null;
    const message =
      selectedCount <= 1 ? (
        <p>
          {"Remove item "}
          <b>{selectedNames}</b>?
        </p>
      ) : (
        <p>
          {"Remove "}
          <b>{selectedCount}</b>
          {" items "}
          <b>{selectedNames}</b>
          {tail}?
        </p>
      );
    const { removeSelectedItems, removeItems } = store;
    const onConfirm =
      typeof removeItems === "function"
        ? () => removeItems.apply(store, [selectedItems])
        : typeof removeSelectedItems === "function"
          ? removeSelectedItems.bind(store)
          : noop;

    openConfirmDialog({
      ok: onConfirm,
      labelOk: "Remove",
      message,
      ...dialogCustomProps,
    });
  }

  renderNoItems() {
    if (this.failedToLoad) {
      return <NoItems>{this.props.failedToLoadMessage}</NoItems>;
    }

    if (!this.props.getIsReady()) {
      return <Spinner center data-testid={this.props.spinnerTestId} />;
    }

    if (this.props.getFilters().length > 0) {
      return (
        <NoItems>
          No items found.
          <p>
            <a onClick={() => this.props.pageFiltersStore.reset()} className="contrast">
              Reset filters?
            </a>
          </p>
        </NoItems>
      );
    }

    return <NoItems />;
  }

  renderItems() {
    if (this.props.virtual) {
      return null;
    }

    return this.props.getItems().map((item) => this.getRow(item.getId()));
  }

  renderTableHeader() {
    const { customizeTableRowProps, renderTableHeader, isSelectable, isConfigurable, store, tableId } = this.props;

    if (!renderTableHeader) {
      return null;
    }

    const enabledItems = this.props.getItems().filter((item) => !customizeTableRowProps?.(item).disabled);

    return (
      <TableHead showTopLine nowrap>
        {isSelectable && (
          <Observer>
            {() => (
              <TableCell
                checkbox
                isChecked={store.isSelectedAll(enabledItems)}
                onClick={prevDefault(() => store.toggleSelectionAll(enabledItems))}
              />
            )}
          </Observer>
        )}
        {renderTableHeader.filter(isDefined).map(
          (cellProps, index) =>
            this.showColumn(cellProps) && (
              <TableCell
                key={cellProps.id ?? index}
                onResizeStart={cellProps.id ? (event) => this.handleResizeStart(cellProps.id!, event) : undefined}
                onResizeReset={cellProps.id ? () => this.handleResizeReset(cellProps.id!) : undefined}
                {...cellProps}
                resizable={cellProps.id !== "logs" && !!cellProps.id}
                style={{
                  ...cellProps.style,
                  flex:
                    cellProps.id && this.columnFlexGrow.has(cellProps.id)
                      ? `${this.columnFlexGrow.get(cellProps.id)} 0`
                      : cellProps.style?.flex,
                }}
              />
            ),
        )}
        <TableCell className="menu">
          {isConfigurable && tableId ? this.renderColumnVisibilityMenu(tableId) : undefined}
        </TableCell>
      </TableHead>
    );
  }

  render() {
    const {
      store,
      hasDetailsView,
      addRemoveButtons = {},
      virtual,
      sortingCallbacks,
      detailsItem,
      className,
      tableProps = {},
      tableId,
      getItems,
      activeTheme,
    } = this.props;
    const selectedItemId = detailsItem && detailsItem.getId();
    const classNames = cssNames(className, "box", "grow", activeTheme.get().type);
    const items = getItems();

    return (
      <div className="items box grow flex column" ref={this.tableRef}>
        {this.resizeGuideX !== null && (
          <div
            ref={this.resizeGuideRef}
            className="resize-guide"
            style={{ right: `calc(100% - ${this.resizeGuideX}px)` }}
          />
        )}
        <Table
          tableId={tableId}
          virtual={virtual}
          selectable={hasDetailsView}
          sortable={sortingCallbacks}
          getTableRow={this.getRow}
          renderRow={virtual ? undefined : this.renderRow}
          items={items}
          selectedItemId={selectedItemId}
          noItems={this.renderNoItems()}
          className={classNames}
          {...tableProps}
        >
          {this.renderTableHeader()}
          {this.renderItems()}
        </Table>

        <Observer>
          {() => {
            const items = getItems();
            const selectedItems = store.pickOnlySelected(items);

            return (
              <AddRemoveButtons
                onRemove={
                  (allowDelete(this.props.userPreferencesState) &&
                  (store.removeItems || store.removeSelectedItems) &&
                  selectedItems.length > 0)
                    ? () => this.removeItemsDialog(selectedItems)
                    : undefined
                }
                removeTooltip={`Remove selected items (${selectedItems.length})`}
                {...addRemoveButtons}
              />
            );
          }}
        </Observer>
      </div>
    );
  }

  showColumn({ id: columnId, showWithColumn }: TableCellProps): boolean {
    const { tableId, isConfigurable } = this.props;

    return !isConfigurable || !tableId || !this.props.isTableColumnHidden(tableId, columnId, showWithColumn);
  }

  renderColumnVisibilityMenu(tableId: string) {
    const { renderTableHeader = [] } = this.props;

    return (
      <MenuActions
        id="menu-actions-for-item-object-list-content"
        className="ItemListLayoutVisibilityMenu"
        toolbar={false}
        autoCloseOnSelect={false}
      >
        {renderTableHeader
          .filter(isDefined)
          .filter((props): props is TableCellProps & { id: string } => !!props.id)
          .filter((props) => !props.showWithColumn)
          .map((cellProps) => (
            <MenuItem key={cellProps.id} className="input">
              <Checkbox
                label={cellProps.title ?? `<${cellProps.className}>`}
                value={this.showColumn(cellProps)}
                onChange={() => this.props.toggleTableColumnVisibility(tableId, cellProps.id)}
              />
            </MenuItem>
          ))}
      </MenuActions>
    );
  }
}

export const ItemListLayoutContent = withInjectables<Dependencies, ItemListLayoutContentProps<ItemObject, boolean>>(
  NonInjectedItemListLayoutContent,
  {
    getProps: (di, props) => ({
      ...props,
      activeTheme: di.inject(activeThemeInjectable),
      pageFiltersStore: di.inject(pageFiltersStoreInjectable),
      openConfirmDialog: di.inject(openConfirmDialogInjectable),
      toggleTableColumnVisibility: di.inject(toggleTableColumnVisibilityInjectable),
      isTableColumnHidden: di.inject(isTableColumnHiddenInjectable),
      columnResizeStorage: di.inject(columnResizeStorageInjectable),
      userPreferencesState: di.inject(userPreferencesStateInjectable),
    }),
  },
) as <Item extends ItemObject, PreLoadStores extends boolean>(
  props: ItemListLayoutContentProps<Item, PreLoadStores>,
) => React.ReactElement;
