/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { historyInjectionToken } from "@freelensapp/routing";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { debounce } from "es-toolkit/compat";
import { comparer, makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import namespaceStoreInjectable from "../namespaces/store.injectable";
import facetsUrlPageParamInjectable from "./facets-url-page-param.injectable";
import persistentSearchStoreInjectable, { isEmptySearch } from "./persistent-search-store.injectable";
import { SavedSearchesPanel } from "./saved-searches-panel";
import savedSearchesStoreInjectable from "./saved-searches-store.injectable";
import { SearchFacetSuggestions } from "./search-facet-suggestions";
import {
  allFieldsId,
  defaultFacetOperator,
  facetKey,
  facetOperatorSymbol,
  facetOperatorTitle,
  isRegexOperator,
  parseFacetOperator,
  parseFacets,
  serializeFacets,
  withFacetValue,
  withoutFacet,
} from "./search-facets";
import { SearchInput } from "./search-input";
import styles from "./search-input-url.module.scss";
import searchOperatorUrlPageParamInjectable from "./search-operator-url-page-param.injectable";
import { compileSearchRegex } from "./search-regex";
import searchUrlPageParamInjectable from "./search-url-page-param.injectable";

import type { History } from "@freelensapp/routing";

import type { SavedSearch } from "../../../features/user-preferences/common/preferences-helpers";
import type { PageParam } from "../../navigation/page-param";
import type { InputProps } from "./input";
import type { PersistedSearch } from "./persistent-search-store.injectable";
import type { FacetOperator, SearchFacet, SearchFieldOption } from "./search-facets";

export interface SearchInputUrlProps extends InputProps {
  compact?: boolean; // show only search-icon when not focused
  /**
   * Named fields to offer as facets. Empty (the default) keeps the box exactly
   * as it was before facets existed: plain text over every searchable field.
   */
  searchFields?: SearchFieldOption[];
}

interface Dependencies {
  searchUrlParam: PageParam<string>;
  facetsUrlParam: PageParam<string>;
  searchOperatorUrlParam: PageParam<string>;
  persistentSearchStore: ReturnType<typeof persistentSearchStoreInjectable.instantiate>;
  savedSearchesStore: ReturnType<typeof savedSearchesStoreInjectable.instantiate>;
  namespaceStore?: ReturnType<typeof namespaceStoreInjectable.instantiate>;
  history: History;
}

const allFieldsTitle = "All fields";

@observer
class NonInjectedSearchInputUrl extends React.Component<SearchInputUrlProps & Dependencies> {
  private readonly disposers: (() => void)[] = [];

  @observable inputVal = ""; // fix: use empty string on init to avoid react warnings
  @observable private lastNamespaceKey = "";
  @observable private lastPlaceholder = "";
  private userTyping = false;

  readonly updateUrl = debounce((val: string) => this.props.searchUrlParam.set(val), 250);
  readonly updateStorage = debounce((storageKey: string, val: string) => {
    this.props.persistentSearchStore.setValue(storageKey, { ...this.currentSearchState, search: val });
    this.userTyping = false;
  }, 250);

  /** The three params that together are the current search. */
  private get currentSearchState(): PersistedSearch {
    return {
      search: this.props.searchUrlParam.get(),
      op: this.props.searchOperatorUrlParam.get(),
      facets: this.props.facetsUrlParam.get(),
    };
  }

  private setSearchState(state: PersistedSearch) {
    this.props.searchUrlParam.set(state.search);
    this.props.searchOperatorUrlParam.set(state.op);
    this.props.facetsUrlParam.set(state.facets);
  }

  /**
   * Records the whole search so navigating away and back restores it.
   *
   * Called from the discrete actions - committing or removing a chip, picking an
   * operator, applying a saved search - while typed text goes through the
   * debounced {@link updateStorage}.
   */
  private persistCurrentState() {
    this.props.persistentSearchStore.setValue(this.getStorageKey(), this.currentSearchState);
  }

  private getCurrentNamespaceKey(): string {
    const { namespaceStore } = this.props;

    if (!namespaceStore) {
      return "global";
    }

    const namespaces = Array.from(namespaceStore.contextNamespaces).sort();

    return namespaces.length > 0 ? namespaces.join(",") : "all-namespaces";
  }

  private getStorageKey(): string {
    const { persistentSearchStore, placeholder } = this.props;

    // When linking is enabled, use a global key (shared across all namespaces and placeholders)
    if (persistentSearchStore.isEnabled) {
      return "global:linked";
    }

    // When linking is disabled, use namespace + placeholder (separate per placeholder per namespace)
    const namespaceKey = this.getCurrentNamespaceKey();
    const placeholderKey = placeholder || "default";
    return `${namespaceKey}:${placeholderKey}`;
  }

  componentDidMount(): void {
    const { searchUrlParam, persistentSearchStore, namespaceStore, placeholder } = this.props;

    this.disposers.push(this.listenForClicksOutside());

    // Capture props into local closures for the reactions below: mobx-react 9
    // forbids reading this.props inside a derivation, and the reaction data
    // functions call getStorageKey/getCurrentNamespaceKey (which read this.props).
    const getCurrentNamespaceKey = (): string => {
      if (!namespaceStore) {
        return "global";
      }

      const namespaces = Array.from(namespaceStore.contextNamespaces).sort();

      return namespaces.length > 0 ? namespaces.join(",") : "all-namespaces";
    };
    const getStorageKey = (): string => {
      if (persistentSearchStore.isEnabled) {
        return "global:linked";
      }

      const namespaceKey = getCurrentNamespaceKey();
      const placeholderKey = placeholder || "default";
      return `${namespaceKey}:${placeholderKey}`;
    };

    // Initialize lastNamespaceKey and lastPlaceholder
    this.lastNamespaceKey = getCurrentNamespaceKey();
    this.lastPlaceholder = placeholder || "default";

    // On first mount, load the stored search and sync it back to the URL. This
    // is what survives navigation, since moving to another view pushes a path
    // with no query at all.
    const storedValue = persistentSearchStore.getValue(getStorageKey());

    if (!isEmptySearch(storedValue)) {
      this.inputVal = storedValue.search;
      this.setSearchState(storedValue);
    } else {
      // If no stored value, check URL
      const urlValue = searchUrlParam.get();
      if (urlValue) {
        this.inputVal = urlValue;
      }
    }

    // Sync inputVal with either persistent store or URL param
    this.disposers.push(
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          storageKey: getStorageKey(),
          persistedValue: persistentSearchStore.getValue(getStorageKey()),
          urlValue: searchUrlParam.get(),
          namespaceKey: getCurrentNamespaceKey(),
          placeholderKey: placeholder || "default",
        }),
        ({ isEnabled, storageKey, persistedValue, urlValue, namespaceKey, placeholderKey }) => {
          const namespaceChanged = namespaceKey !== this.lastNamespaceKey;
          const placeholderChanged = placeholderKey !== this.lastPlaceholder;
          const contextChanged = namespaceChanged || (placeholderChanged && !isEnabled);

          // Skip overwriting inputVal while user is actively typing — the debounced
          // storage/URL updates will eventually bring everything back in sync.
          if (this.userTyping && !contextChanged) {
            this.lastNamespaceKey = namespaceKey;
            this.lastPlaceholder = placeholderKey;
            return;
          }

          // When persistence is enabled, sync to persisted value
          if (isEnabled) {
            this.inputVal = persistedValue.search;
            this.setSearchState(persistedValue);
          } else {
            // When persistence is disabled
            if (contextChanged) {
              // Load stored value for this specific placeholder+namespace or clear if none
              this.inputVal = persistedValue.search;
              this.setSearchState(persistedValue);
            } else {
              // When user types in URL or uses browser back/forward, sync from URL
              if (urlValue !== this.inputVal) {
                this.inputVal = urlValue;
              }
            }
          }

          this.lastNamespaceKey = namespaceKey;
          this.lastPlaceholder = placeholderKey;
        },
        { equals: comparer.structural },
      ),
    );

    // When persistence is enabled and there's a persistent value, sync it to URL
    this.disposers.push(
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          storageKey: getStorageKey(),
        }),
        ({ isEnabled, storageKey }) => {
          if (isEnabled) {
            const persistedValue = persistentSearchStore.getValue(storageKey);

            // Always sync to URL, even if empty (to clear filter when switching namespaces)
            this.setSearchState(persistedValue);
          }
        },
        { fireImmediately: true, equals: comparer.structural },
      ),
    );
  }

  componentWillUnmount(): void {
    this.disposers.forEach((dispose) => dispose());
  }

  // Capture, so a handler that stops propagation cannot leave a panel stuck open.
  private readonly listenForClicksOutside = () => {
    window.addEventListener("mousedown", this.onClickOutside, true);

    return () => window.removeEventListener("mousedown", this.onClickOutside, true);
  };

  setValue = (value: string) => {
    const storageKey = this.getStorageKey();

    this.userTyping = true;
    this.inputVal = value;
    this.updateUrl(value);
    this.updateStorage(storageKey, value);
  };

  clear = () => {
    this.setValue("");
    this.updateUrl.flush();
    this.updateStorage.flush();
    this.userTyping = false;
  };

  onChange = (val: string, evt: React.ChangeEvent<any>) => {
    this.setValue(val);
    this.props.onChange?.(val, evt);
  };

  togglePersistence = (newState: boolean) => {
    const { persistentSearchStore } = this.props;

    // The whole search moves across, chips included: carrying only the text
    // would turn a faceted search into a bare query on toggling the link.
    const currentState = this.currentSearchState;

    if (newState) {
      // When enabling linking (switching to global shared):
      // 1. Save current search to the global key FIRST
      // 2. Then enable persistence
      if (!isEmptySearch(currentState)) {
        persistentSearchStore.setValue("global:linked", currentState);
      }
      persistentSearchStore.setEnabled(newState);
    } else {
      // When disabling linking (switching to per-namespace per-placeholder):
      // 1. Disable persistence first
      // 2. Save current value to namespace+placeholder-specific key
      persistentSearchStore.setEnabled(newState);

      if (!isEmptySearch(currentState)) {
        // getStorageKey is namespace+placeholder-specific now
        persistentSearchStore.setValue(this.getStorageKey(), currentState);
      }
    }
  };

  @observable private highlightedSuggestion = -1;

  /**
   * Operator applied to the text being typed and to the next facet committed.
   *
   * Kept in a URL param rather than component state so `ItemListLayout` can
   * apply it to the live query: picking `=` has to re-filter immediately, not
   * wait for a chip. It stays put after a commit, so adding several `!=`
   * filters in a row does not mean re-picking each time.
   */
  private get pendingOperator(): FacetOperator {
    return parseFacetOperator(this.props.searchOperatorUrlParam.get());
  }

  private setPendingOperator(op: FacetOperator) {
    // The default is the empty param, keeping it out of a shared link.
    this.props.searchOperatorUrlParam.set(op === defaultFacetOperator ? "" : op);
    this.persistCurrentState();
  }

  private get facets(): SearchFacet[] {
    return parseFacets(this.props.facetsUrlParam.get());
  }

  private setFacets(facets: SearchFacet[]) {
    this.props.facetsUrlParam.set(serializeFacets(facets));
    this.persistCurrentState();
  }

  @observable private savedSearchesOpen = false;
  @observable private newSearchName = "";

  private readonly wrapperRef = React.createRef<HTMLDivElement>();

  /**
   * Closes whichever panel is open when the click lands outside the box.
   *
   * Clicking away confirms the query being typed rather than discarding it: it
   * becomes an "All fields" chip carrying the armed operator, so the work of
   * typing and picking an operator is not lost to a stray click.
   */
  private onClickOutside = (evt: MouseEvent) => {
    const wrapper = this.wrapperRef.current;

    if (!wrapper || wrapper.contains(evt.target as Node)) {
      return;
    }

    this.savedSearchesOpen = false;

    if (this.suggestions.length > 0) {
      this.commitFacet(allFieldsId);
    }
  };

  /** Route the saved searches of this box belong to. */
  private get view(): string {
    return this.props.history.location.pathname;
  }

  private get hasSomethingToSave(): boolean {
    const { search, facets } = this.currentSearchState;

    // The operator alone filters nothing, so it is not worth a saved entry.
    return search !== "" || facets !== "";
  }

  private applySavedSearch = (saved: SavedSearch) => {
    const { search, op, facets } = saved;

    // Cancel first: a pending debounce from the text being typed would land
    // after this and overwrite the search that was just applied.
    this.updateUrl.cancel();
    this.updateStorage.cancel();
    this.userTyping = false;

    this.setSearchState({ search, op, facets });

    // The box shows committed state as chips, so the draft text is whatever the
    // saved "all fields" query was.
    this.inputVal = search;

    // Persisted too, or navigating away and back would lose it: moving to
    // another view pushes a path with no query.
    this.persistCurrentState();
    this.savedSearchesOpen = false;
  };

  private saveCurrentSearch = () => {
    const name = this.newSearchName.trim();

    if (!name || !this.hasSomethingToSave) {
      return;
    }

    // Flush first: the typed text only reaches the URL after a debounce, and
    // saving mid-debounce would store the previous query.
    this.updateUrl.flush();
    this.props.savedSearchesStore.save(this.view, name, this.currentSearchState);
    this.newSearchName = "";
  };

  private titleForField(field: string): string | undefined {
    if (field === allFieldsId) {
      return allFieldsTitle;
    }

    return this.props.searchFields?.find(({ id }) => id === field)?.title;
  }

  /**
   * How a chip names its field.
   *
   * This view's own label wins, so renaming one takes effect everywhere. The
   * label frozen into the facet only covers the fields this view does not have,
   * which the linked search brings in from elsewhere; the raw id is the last
   * resort, for a facet hand-written into the URL.
   */
  private titleForFacet(facet: SearchFacet): string {
    return this.titleForField(facet.field) ?? facet.title ?? facet.field;
  }

  /**
   * Whether the facet's field is searchable in this view.
   *
   * Mirrors the rule `ItemListLayout` filters by, off the same field list, so a
   * chip is struck through exactly when it is being skipped.
   */
  private isFieldAvailable(field: string): boolean {
    return field === allFieldsId || (this.props.searchFields ?? []).some(({ id }) => id === field);
  }

  /** The fields offered for the text being typed: every named one, plus "all". */
  private get suggestions(): SearchFieldOption[] {
    const { searchFields = [] } = this.props;

    if (searchFields.length === 0 || this.inputVal.trim() === "") {
      return [];
    }

    return [{ id: allFieldsId, title: allFieldsTitle }, ...searchFields];
  }

  private commitFacet = (field: string) => {
    const value = this.inputVal.trim();

    if (!value) {
      return;
    }

    // The label travels with the facet so it still reads properly on a view that
    // does not have this field.
    this.setFacets(withFacetValue(this.facets, field, this.pendingOperator, value, this.titleForField(field)));

    // The text has become a chip, so the live "all fields" query that was
    // filtering while it was typed has to go, or it would AND on top of itself.
    this.clear();
    this.highlightedSuggestion = -1;
  };

  private removeFacet = (facet: SearchFacet) => {
    this.setFacets(withoutFacet(this.facets, facet.field, facet.op ?? defaultFacetOperator));
  };

  private onSearchKeyDown = (evt: React.KeyboardEvent<any>) => {
    const { suggestions } = this;

    if (evt.key === "Backspace" && this.inputVal === "") {
      const last = this.facets.at(-1);

      if (last) {
        this.removeFacet(last);
        evt.preventDefault();
      }

      return;
    }

    if (suggestions.length === 0) {
      return;
    }

    switch (evt.key) {
      case "ArrowDown":
        this.highlightedSuggestion = (this.highlightedSuggestion + 1) % suggestions.length;
        evt.preventDefault();
        break;

      case "ArrowUp":
        this.highlightedSuggestion =
          this.highlightedSuggestion <= 0 ? suggestions.length - 1 : this.highlightedSuggestion - 1;
        evt.preventDefault();
        break;

      case "Enter": {
        // Without a pick, Enter is left alone: the text is already filtering
        // every field live, which is what it did before facets existed.
        const chosen = suggestions[this.highlightedSuggestion];

        if (chosen) {
          this.commitFacet(chosen.id);
          evt.preventDefault();
        }
        break;
      }

      case "Escape":
        // Collapse the list first; a second Escape reaches SearchInput and
        // clears the text, which is the pre-existing behaviour.
        if (this.highlightedSuggestion !== -1) {
          this.highlightedSuggestion = -1;
          evt.stopPropagation();
        }
        break;
    }
  };

  private renderFacets() {
    const { facets } = this;

    if (facets.length === 0) {
      return null;
    }

    return (
      <div className={styles.facets}>
        {facets.map((facet) => {
          const title = this.titleForFacet(facet);
          const description = `${title} ${facetOperatorTitle(facet.op)} ${facet.values.join(" or ")}`;
          const available = this.isFieldAvailable(facet.field);

          return (
            <div
              key={facetKey(facet)}
              className={cssNames(styles.facet, { [styles.facetUnavailable]: !available })}
              title={
                available ? description : `${description} - this view has no ${title} field, so it is not applied here`
              }
              data-testid={`search-facet-${facet.field}`}
            >
              <span className={styles.facetTitle}>{title}</span>
              <span className={styles.facetOperator}>{facetOperatorSymbol(facet.op)}</span>
              <span>{facet.values.join(" or ")}</span>
              <Icon
                smallest
                material="close"
                // The chip sits inside the field's <label>, so a bare click
                // would also be a click on the label. Stop it there.
                onClick={(evt) => {
                  evt.preventDefault();
                  evt.stopPropagation();
                  this.removeFacet(facet);
                }}
                tooltip={`Remove filter: ${description}`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  private renderSavedSearches() {
    if (!this.savedSearchesOpen) {
      return null;
    }

    return (
      <SavedSearchesPanel
        searches={this.props.savedSearchesStore.forView(this.view)}
        canSave={this.hasSomethingToSave}
        newName={this.newSearchName}
        onNewNameChange={(name) => {
          this.newSearchName = name;
        }}
        onSave={this.saveCurrentSearch}
        onApply={this.applySavedSearch}
        onDelete={(name) => this.props.savedSearchesStore.remove(this.view, name)}
      />
    );
  }

  private renderSuggestions() {
    const { suggestions } = this;

    if (suggestions.length === 0) {
      return null;
    }

    return (
      <SearchFacetSuggestions
        options={suggestions}
        value={this.inputVal.trim()}
        operator={this.pendingOperator}
        onPickOperator={(op) => this.setPendingOperator(op)}
        highlighted={this.highlightedSuggestion}
        onHighlight={(index) => {
          this.highlightedSuggestion = index;
        }}
        onPick={this.commitFacet}
      />
    );
  }

  constructor(props: SearchInputUrlProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  render() {
    // Every injected dependency has to be pulled out here: whatever is left in
    // `searchInputProps` is spread onto `Input` and reaches the DOM element, so
    // a missed one is rendered as an `[object Object]` attribute.
    const {
      searchUrlParam,
      facetsUrlParam,
      searchOperatorUrlParam,
      persistentSearchStore,
      savedSearchesStore,
      namespaceStore,
      history,
      searchFields,
      ...searchInputProps
    } = this.props;

    // Only flag a pattern the engine rejects, and only while a regex operator
    // is armed. A valid pattern matching nothing is a normal empty result.
    const hasInvalidRegex =
      isRegexOperator(this.pendingOperator) && this.inputVal !== "" && compileSearchRegex(this.inputVal) === undefined;

    return (
      <div className={styles.wrapper} ref={this.wrapperRef}>
        <SearchInput
          value={this.inputVal}
          onChange={(val, event) => {
            this.setValue(val);
            this.props.onChange?.(val, event);
          }}
          onClear={this.clear}
          {...searchInputProps}
          onKeyDown={this.onSearchKeyDown}
          // Rendered inside the field's own <label>, so the chips read as part
          // of the search box rather than as controls sitting next to it.
          contentLeft={this.renderFacets()}
          className={cssNames(searchInputProps.className, styles.searchInput, {
            invalidRegex: hasInvalidRegex,
          })}
        />
        {this.renderSuggestions()}
        {this.renderSavedSearches()}
        <Icon
          small
          material={this.savedSearchesOpen ? "bookmark" : "bookmark_border"}
          active={this.savedSearchesOpen}
          onClick={() => {
            this.savedSearchesOpen = !this.savedSearchesOpen;
          }}
          tooltip="Saved searches"
        />
        <Icon
          small
          material={persistentSearchStore.isEnabled ? "link" : "link_off"}
          onClick={() => this.togglePersistence(!persistentSearchStore.isEnabled)}
          tooltip={persistentSearchStore.isEnabled ? "Unlink search (per-view)" : "Link search (shared)"}
        />
      </div>
    );
  }
}

export const SearchInputUrl = withInjectables<Dependencies, SearchInputUrlProps>(NonInjectedSearchInputUrl, {
  getProps: (di, props) => {
    const canCreateStores = di.inject(storesAndApisCanBeCreatedInjectionToken);

    return {
      ...props,
      searchUrlParam: di.inject(searchUrlPageParamInjectable),
      facetsUrlParam: di.inject(facetsUrlPageParamInjectable),
      searchOperatorUrlParam: di.inject(searchOperatorUrlPageParamInjectable),
      savedSearchesStore: di.inject(savedSearchesStoreInjectable),
      history: di.inject(historyInjectionToken),
      persistentSearchStore: di.inject(persistentSearchStoreInjectable),
      namespaceStore: canCreateStores ? di.inject(namespaceStoreInjectable) : undefined,
    };
  },
});
