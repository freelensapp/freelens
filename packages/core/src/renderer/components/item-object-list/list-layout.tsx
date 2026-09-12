/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./item-list-layout.scss";

import { cssNames, isDefined, noop } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { groupBy } from "es-toolkit";
import { makeObservable, observable, untracked } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import selectedFilterNamespacesInjectable from "../../../common/k8s-api/selected-filter-namespaces.injectable";
import userPreferencesStateInjectable, {
  type UserPreferencesState,
} from "../../../features/user-preferences/common/state.injectable";
import facetsUrlPageParamInjectable from "../input/facets-url-page-param.injectable";
import { allFieldsId, compileFacet, parseFacetOperator, parseFacets } from "../input/search-facets";
import searchOperatorUrlPageParamInjectable from "../input/search-operator-url-page-param.injectable";
import { ItemListLayoutContent } from "./content";
import { ItemListLayoutFilters } from "./filters";
import { ItemListLayoutHeader } from "./header";
import { PageFiltersList } from "./page-filters/list";
import { FilterType } from "./page-filters/store";
import pageFiltersStoreInjectable from "./page-filters/store.injectable";
import itemListLayoutStorageInjectable from "./storage.injectable";

import type { ItemObject, TableCellProps } from "@freelensapp/list-layout";
import type { IClassName, SingleOrMany, StrictReactNode } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { SubscribableStore } from "../../kube-watch-api/kube-watch-api";
import type { PageParam } from "../../navigation/page-param";
import type { StorageLayer } from "../../utils/storage-helper";
import type { AddRemoveButtonsProps } from "../add-remove-buttons";
import type { ConfirmDialogParams } from "../confirm-dialog";
import type { SearchInputUrlProps } from "../input";
import type { CompiledFacet, SearchFacet } from "../input/search-facets";
import type { TableProps, TableRowProps, TableSortCallbacks } from "../table";
import type { PageFiltersStore } from "./page-filters/store";

export type ListLayoutSearchFilter<I extends ItemObject> = (
  item: I,
) => SingleOrMany<string | number | undefined | null>;
export type ListLayoutSearchFilters<I extends ItemObject> = Record<string, ListLayoutSearchFilter<I>>;

/**
 * A searchable field a view exposes by name, so the search box can offer it as
 * a facet to combine with others.
 *
 * Views that declare only the anonymous {@link ItemListLayoutProps.searchFilters}
 * keep working unchanged - they simply offer nothing but "All fields".
 */
export interface NamedSearchFilter<I extends ItemObject> {
  /** Stable id; it travels in the URL, so renaming it invalidates saved links. */
  id: string;
  /** Label shown in the facet dropdown and on the chip. */
  title: string;
  getValue: ListLayoutSearchFilter<I>;
  /**
   * Searched by "All fields" but not offered as a facet of its own.
   *
   * For fields nobody filters on deliberately, like a uid: dropping them would
   * silently narrow what a plain query finds, and listing them would clutter
   * the dropdown.
   */
  hidden?: boolean;
}
export type ListLayoutItemsFilter<I extends ItemObject> = (items: I[]) => I[];
export type ListLayoutItemsFilters<I extends ItemObject> = Record<string, ListLayoutItemsFilter<I>>;

export interface HeaderPlaceholders {
  title?: StrictReactNode;
  searchProps?: SearchInputUrlProps;
  filters?: StrictReactNode;
  info?: StrictReactNode;
}

export type ItemListStore<I extends ItemObject, PreLoadStores extends boolean> = {
  readonly isLoaded: boolean;
  readonly failedLoading: boolean;
  getTotalCount: () => number;
  isSelected: (item: I) => boolean;
  toggleSelection: (item: I) => void;
  isSelectedAll: (items: I[]) => boolean;
  toggleSelectionAll: (enabledItems: I[]) => void;
  pickOnlySelected: (items: I[]) => I[];
} & (
  | {
      removeItems: (selectedItems: I[]) => Promise<void>;
      readonly selectedItems: I[];
      removeSelectedItems?: unknown;
    }
  | {
      removeSelectedItems: () => Promise<void>;
      selectedItems?: unknown;
      removeItems?: unknown;
    }
) &
  (PreLoadStores extends true
    ? {
        loadAll: (selectedNamespaces: readonly string[]) => Promise<void>;
      }
    : {
        loadAll?: unknown;
      });

export type RenderHeaderTitle<Item extends ItemObject, PreLoadStores extends boolean> =
  | StrictReactNode
  | ((parent: NonInjectedItemListLayout<Item, PreLoadStores>) => StrictReactNode);

export type HeaderCustomizer = (placeholders: HeaderPlaceholders) => HeaderPlaceholders;
export type ItemListLayoutProps<Item extends ItemObject, PreLoadStores extends boolean = boolean> = {
  tableId?: string;
  className: IClassName;
  getItems: () => Item[];
  store: ItemListStore<Item, PreLoadStores>;
  dependentStores?: SubscribableStore[];
  preloadStores?: boolean;
  hideFilters?: boolean;
  searchFilters?: ListLayoutSearchFilter<Item>[];
  /**
   * Named searchable fields, offered individually in the search box so they can
   * be combined as facets. When given, these also back the "All fields" facet,
   * making {@link searchFilters} redundant for the view.
   */
  searchFields?: NamedSearchFilter<Item>[];
  filterItems?: ListLayoutItemsFilter<Item>[];

  // header (title, filtering, searching, etc.)
  showHeader?: boolean;
  headerClassName?: IClassName;
  renderHeaderTitle?: RenderHeaderTitle<Item, PreLoadStores>;
  customizeHeader?: HeaderCustomizer | HeaderCustomizer[];

  // items list configuration
  isReady?: boolean; // show loading indicator while not ready
  isSelectable?: boolean; // show checkbox in rows for selecting items
  isConfigurable?: boolean;
  defaultHiddenTableColumns?: string[];
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
  renderFooter?: (parent: NonInjectedItemListLayout<Item, PreLoadStores>) => StrictReactNode;

  spinnerTestId?: string;

  /**
   * Message to display when a store failed to load
   *
   * @default "Failed to load items"
   */
  failedToLoadMessage?: StrictReactNode;

  filterCallbacks?: ListLayoutItemsFilters<Item>;
  "data-testid"?: string;
} & (PreLoadStores extends true
  ? {
      preloadStores?: true;
    }
  : {
      preloadStores: false;
    });

const defaultProps: Partial<ItemListLayoutProps<ItemObject, true>> = {
  showHeader: true,
  isSelectable: true,
  isConfigurable: false,
  copyClassNameFromHeadCells: true,
  preloadStores: true,
  dependentStores: [],
  searchFilters: [],
  searchFields: [],
  customizeHeader: [],
  filterItems: [],
  hasDetailsView: true,
  onDetails: noop,
  virtual: true,
  customizeTableRowProps: () => ({}),
  failedToLoadMessage: "Failed to load items",
};

export interface ItemListLayoutStorage {
  showFilters: boolean;
}

interface Dependencies {
  selectedFilterNamespaces: IComputedValue<string[]>;
  itemListLayoutStorage: StorageLayer<ItemListLayoutStorage>;
  pageFiltersStore: PageFiltersStore;
  userPreferencesState: UserPreferencesState;
  facetsUrlParam: PageParam<string>;
  searchOperatorUrlParam: PageParam<string>;
}

@observer
class NonInjectedItemListLayout<I extends ItemObject, PreLoadStores extends boolean> extends React.Component<
  ItemListLayoutProps<I, PreLoadStores> & Dependencies
> {
  static defaultProps = defaultProps as object;

  // mobx-react 9 forbids reading this.props inside a derivation, and the child
  // header/filters/content observers invoke the getters below from within their
  // own render reactions. Keep an observable snapshot of props (updated on every
  // update) so those getters can be read reactively from any derivation.
  @observable.ref private observableProps: Readonly<ItemListLayoutProps<I, PreLoadStores> & Dependencies>;

  constructor(props: ItemListLayoutProps<I, PreLoadStores> & Dependencies) {
    super(props);
    this.observableProps = props;
    makeObservable(this);
    autoBindReact(this);
  }

  componentDidUpdate() {
    this.observableProps = this.props;
  }

  async componentDidMount() {
    const { isConfigurable, tableId, preloadStores } = this.props;

    if (isConfigurable) {
      if (!tableId) {
        throw new Error("[ItemListLayout]: configurable list require props.tableId to be specified");
      }

      const config = this.props.userPreferencesState.hiddenTableColumns.get(tableId);
      if (config === undefined && this.props.defaultHiddenTableColumns) {
        this.props.userPreferencesState.hiddenTableColumns.set(tableId, new Set(this.props.defaultHiddenTableColumns));
      }
    }

    if (preloadStores) {
      const { store, dependentStores = [] } = this.props;
      const stores = Array.from(new Set([store, ...dependentStores])) as ItemListStore<I, true>[];

      stores.forEach((store) => store.loadAll(this.props.selectedFilterNamespaces.get()));
    }
  }

  get showFilters(): boolean {
    return this.observableProps.itemListLayoutStorage.get().showFilters;
  }

  set showFilters(showFilters: boolean) {
    this.observableProps.itemListLayoutStorage.merge({ showFilters });
  }

  // These getters read props from the observable snapshot (observableProps), not
  // this.props: mobx-react 9 forbids reading this.props inside a derivation, and
  // the child header/filters/content observers call them from their own render
  // reactions. observableProps keeps the reads reactive across those boundaries.
  get filters() {
    let { activeFilters } = this.observableProps.pageFiltersStore;
    const { searchFilters = [], searchFields = [] } = this.observableProps;

    // A view with nothing searchable must not carry a search filter left over
    // from another view. `searchFields` counts too: a fully migrated view
    // declares only those, and dropping the filter would leave its search box
    // typing into the void.
    if (searchFilters.length === 0 && searchFields.length === 0) {
      activeFilters = activeFilters.filter(({ type }) => type !== FilterType.SEARCH);
    }

    return activeFilters;
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  get isReady() {
    return this.observableProps.isReady ?? this.observableProps.store.isLoaded;
  }

  renderFilters() {
    const { hideFilters } = this.props;
    const { isReady, filters } = this;

    if (!isReady || !filters.length || hideFilters || !this.showFilters) {
      return null;
    }

    return <PageFiltersList filters={filters} />;
  }

  /**
   * The getters one facet reads: a single named field, or every searchable field
   * of the view for {@link allFieldsId}.
   *
   * Resolved once per filter pass, never per item - `searchFields.map(...)` in
   * the item loop allocates an array for every row on every keystroke.
   */
  private gettersFor(field: string): ListLayoutSearchFilter<I>[] {
    const { searchFields = [], searchFilters = [] } = this.observableProps;

    if (field === allFieldsId) {
      // A view that names its fields is expected to name all of them, `hidden`
      // included; unioning both sources instead would compute every shared
      // field twice per item, and `getSearchFields()` re-stringifies labels.
      return searchFields.length > 0 ? searchFields.map(({ getValue }) => getValue) : searchFilters;
    }

    const named = searchFields.find((candidate) => candidate.id === field);

    return named ? [named.getValue] : [];
  }

  /**
   * Whether a facet's field is searchable here.
   *
   * A search carried in from another view - the linked search does exactly that
   * - can name a field this one does not have. Such a facet is skipped rather
   * than applied: with no texts to read, a positive operator would empty the
   * list and a negative one would filter nothing, so the same chip would either
   * look broken or lie about being applied depending on its operator. The chip
   * is shown struck through instead, and is kept so it applies again on a view
   * that does have the field.
   */
  private isFieldAvailable(field: string): boolean {
    const { searchFields = [] } = this.observableProps;

    return field === allFieldsId || searchFields.some((candidate) => candidate.id === field);
  }

  /** Facets that actually filter here. */
  private get applicableFacets(): SearchFacet[] {
    return parseFacets(this.observableProps.facetsUrlParam.get()).filter((facet) => this.isFieldAvailable(facet.field));
  }

  /**
   * Whether any text of any of these getters satisfies the facet.
   *
   * Walks the fields one text at a time and returns on the first hit, so a match
   * on the name never costs the work of stringifying labels.
   */
  private anyTextMatches(item: I, getters: ListLayoutSearchFilter<I>[], compiled: CompiledFacet): boolean {
    for (const getTexts of getters) {
      const value = getTexts(item);

      if (Array.isArray(value)) {
        for (const text of value) {
          if (compiled.test(text)) {
            return true;
          }
        }
      } else if (compiled.test(value)) {
        return true;
      }
    }

    return false;
  }

  private matches(item: I, getters: ListLayoutSearchFilter<I>[], compiled: CompiledFacet): boolean {
    const found = this.anyTextMatches(item, getters, compiled);

    return compiled.negated ? !found : found;
  }

  private filterCallbacks: ListLayoutItemsFilters<I> = {
    [FilterType.SEARCH]: (items) => {
      const { searchFilters = [], searchFields = [] } = this.observableProps;
      const search = this.observableProps.pageFiltersStore.getValues(FilterType.SEARCH)[0] || "";

      if (!search || (searchFilters.length === 0 && searchFields.length === 0)) {
        return items;
      }

      // The plain search box is the "all fields" facet carrying whichever
      // operator the box has armed, matched by the same code as the committed
      // chips. Reading the operator here is what makes picking `=~` re-filter
      // straight away instead of only once a chip is committed.
      const compiled = compileFacet({
        field: allFieldsId,
        values: [search],
        op: parseFacetOperator(this.observableProps.searchOperatorUrlParam.get()),
      });

      if (!compiled) {
        return items;
      }

      const getters = this.gettersFor(allFieldsId);

      return items.filter((item) => this.matches(item, getters, compiled));
    },
  };

  /** AND across facets, OR within each. */
  private filterByFacets = (items: I[]): I[] => {
    const facets = this.applicableFacets;

    if (facets.length === 0) {
      return items;
    }

    // Compiled and resolved per facet, outside the item loop.
    const matchers = facets
      .map((facet) => {
        const compiled = compileFacet(facet);

        return compiled ? { getters: this.gettersFor(facet.field), compiled } : undefined;
      })
      .filter(isDefined);

    if (matchers.length === 0) {
      return items;
    }

    return items.filter((item) => matchers.every(({ getters, compiled }) => this.matches(item, getters, compiled)));
  };

  get items() {
    const filterGroups = groupBy(this.filters, ({ type }) => type);
    const filterItems: ListLayoutItemsFilter<I>[] = [];

    for (const [type, filtersGroup] of Object.entries(filterGroups)) {
      const filterCallback = this.filterCallbacks[type] ?? this.observableProps.filterCallbacks?.[type];

      if (filterCallback && filtersGroup.length > 0) {
        filterItems.push(filterCallback);
      }
    }

    const items = this.observableProps.getItems();

    // Facets are not driven by `pageFiltersStore`, so their filter is always in
    // the chain; it returns the list untouched when no chips are set.
    return applyFilters(filterItems.concat(this.filterByFacets, this.observableProps.filterItems ?? []), items);
  }

  render() {
    const { renderHeaderTitle, "data-testid": dataTestId } = this.props;

    return untracked(() => (
      <div className={cssNames("ItemListLayout flex flex-col", this.props.className)} data-testid={dataTestId}>
        <ItemListLayoutHeader
          getItems={() => this.items}
          getFilters={() => this.filters}
          toggleFilters={this.toggleFilters}
          store={this.props.store}
          searchFilters={this.props.searchFilters}
          searchFields={this.props.searchFields}
          // Only the applicable ones: a skipped facet is not narrowing the list,
          // so counting it would report the view as filtered when it is not.
          //
          // observableProps, not this.props: the header calls this from inside
          // its own render reaction, where mobx-react 9 forbids reading props.
          getFacetCount={() => this.applicableFacets.length}
          showHeader={this.props.showHeader}
          headerClassName={this.props.headerClassName}
          renderHeaderTitle={
            typeof renderHeaderTitle === "function" ? () => renderHeaderTitle(this) : renderHeaderTitle
          }
          customizeHeader={this.props.customizeHeader}
        />

        <ItemListLayoutFilters
          getIsReady={() => this.isReady}
          getFilters={() => this.filters}
          getFiltersAreShown={() => this.showFilters}
          hideFilters={this.props.hideFilters ?? false}
        />

        <ItemListLayoutContent<I, PreLoadStores>
          getItems={() => this.items}
          getFilters={() => this.filters}
          tableId={this.props.tableId}
          className={this.props.className}
          store={this.props.store}
          getIsReady={() => this.isReady}
          isSelectable={this.props.isSelectable}
          isConfigurable={this.props.isConfigurable}
          copyClassNameFromHeadCells={this.props.copyClassNameFromHeadCells}
          sortingCallbacks={this.props.sortingCallbacks}
          tableProps={this.props.tableProps}
          renderTableHeader={this.props.renderTableHeader}
          renderTableContents={this.props.renderTableContents}
          renderItemMenu={this.props.renderItemMenu}
          customizeTableRowProps={this.props.customizeTableRowProps}
          addRemoveButtons={this.props.addRemoveButtons}
          virtual={this.props.virtual}
          hasDetailsView={this.props.hasDetailsView}
          detailsItem={this.props.detailsItem}
          onDetails={this.props.onDetails}
          customizeRemoveDialog={this.props.customizeRemoveDialog}
          failedToLoadMessage={this.props.failedToLoadMessage}
          spinnerTestId={this.props.spinnerTestId}
        />

        {this.props.renderFooter?.(this)}
      </div>
    ));
  }
}

export const ItemListLayout = withInjectables<Dependencies, ItemListLayoutProps<ItemObject, boolean>>(
  NonInjectedItemListLayout,
  {
    getProps: (di, props) => ({
      ...props,
      selectedFilterNamespaces: di.inject(selectedFilterNamespacesInjectable),
      itemListLayoutStorage: di.inject(itemListLayoutStorageInjectable),
      pageFiltersStore: di.inject(pageFiltersStoreInjectable),
      userPreferencesState: di.inject(userPreferencesStateInjectable),
      facetsUrlParam: di.inject(facetsUrlPageParamInjectable),
      searchOperatorUrlParam: di.inject(searchOperatorUrlPageParamInjectable),
    }),
  },
) as <I extends ItemObject, PreLoadStores extends boolean = true>(
  props: ItemListLayoutProps<I, PreLoadStores>,
) => React.ReactElement;

function applyFilters<I extends ItemObject>(filters: ListLayoutItemsFilter<I>[], items: I[]): I[] {
  if (!filters || !filters.length) {
    return items;
  }

  return filters.reduce((items, filter) => filter(items), items);
}
