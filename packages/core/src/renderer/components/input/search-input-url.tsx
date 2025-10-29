/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import debounce from "lodash/debounce";
import { comparer, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { SearchInput } from "./search-input";
import { Checkbox } from "../checkbox/checkbox";
import searchUrlPageParamInjectable from "./search-url-page-param.injectable";
import persistentSearchStoreInjectable from "./persistent-search-store.injectable";
import namespaceStoreInjectable from "../namespaces/store.injectable";
import { storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";

import type { PageParam } from "../../navigation/page-param";
import type { InputProps } from "./input";

export interface SearchInputUrlProps extends InputProps {
  compact?: boolean; // show only search-icon when not focused
}

interface Dependencies {
  searchUrlParam: PageParam<string>;
  persistentSearchStore: ReturnType<typeof persistentSearchStoreInjectable.instantiate>;
  namespaceStore?: ReturnType<typeof namespaceStoreInjectable.instantiate>;
}

@observer
class NonInjectedSearchInputUrl extends React.Component<SearchInputUrlProps & Dependencies> {
  @observable inputVal = ""; // fix: use empty string on init to avoid react warnings
  @observable private lastNamespaceKey = "";

  readonly updateUrl = debounce((val: string) => this.props.searchUrlParam.set(val), 250);

  private getCurrentNamespaceKey(): string {
    const { namespaceStore } = this.props;

    if (!namespaceStore) {
      return "global";
    }

    const namespaces = Array.from(namespaceStore.contextNamespaces).sort();

    return namespaces.length > 0 ? namespaces.join(",") : "all-namespaces";
  }

  componentDidMount(): void {
    const { searchUrlParam, persistentSearchStore } = this.props;

    // Initialize lastNamespaceKey
    this.lastNamespaceKey = this.getCurrentNamespaceKey();

    // Sync inputVal with either persistent store or URL param
    disposeOnUnmount(this, [
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          persistedValue: persistentSearchStore.isEnabled
            ? persistentSearchStore.getValue(this.getCurrentNamespaceKey())
            : "",
          urlValue: searchUrlParam.get(),
          namespaceKey: this.getCurrentNamespaceKey(),
        }),
        ({ isEnabled, persistedValue, urlValue, namespaceKey }) => {
          const namespaceChanged = namespaceKey !== this.lastNamespaceKey;

          // Only update input when switching between persistence modes or namespace changes
          // Don't overwrite user's current input during typing
          if (isEnabled) {
            // When persistence is enabled, always sync to persisted value
            // (which will be empty string if nothing stored for this namespace)
            this.inputVal = persistedValue;
          } else {
            // When persistence is disabled
            if (namespaceChanged) {
              // Clear filter when switching namespaces
              this.inputVal = "";
              searchUrlParam.set("");
            } else {
              // Otherwise sync to URL param
              this.inputVal = urlValue;
            }
          }

          this.lastNamespaceKey = namespaceKey;
        },
        { fireImmediately: true, equals: comparer.structural },
      ),
    ]);

    // When persistence is enabled and there's a persistent value, sync it to URL
    disposeOnUnmount(this, [
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          namespaceKey: this.getCurrentNamespaceKey(),
        }),
        ({ isEnabled, namespaceKey }) => {
          if (isEnabled) {
            const persistedValue = persistentSearchStore.getValue(namespaceKey);

            // Always sync to URL, even if empty (to clear filter when switching namespaces)
            searchUrlParam.set(persistedValue);
          }
        },
        { fireImmediately: true, equals: comparer.structural },
      ),
    ]);
  }

  setValue = (value: string) => {
    const { persistentSearchStore } = this.props;

    this.inputVal = value;
    this.updateUrl(value);

    if (persistentSearchStore.isEnabled) {
      const namespaceKey = this.getCurrentNamespaceKey();

      persistentSearchStore.setValue(namespaceKey, value);
    }
  };

  clear = () => {
    this.setValue("");
    this.updateUrl.flush();
  };

  onChange = (val: string, evt: React.ChangeEvent<any>) => {
    this.setValue(val);
    this.props.onChange?.(val, evt);
  };

  togglePersistence = (newState: boolean) => {
    const { persistentSearchStore } = this.props;
    const namespaceKey = this.getCurrentNamespaceKey();

    if (newState) {
      // When enabling persistence, save current search value FIRST
      if (this.inputVal) {
        persistentSearchStore.setValue(namespaceKey, this.inputVal);
      }
      persistentSearchStore.setEnabled(newState);
    } else {
      // When disabling persistence, clear the stored value
      persistentSearchStore.setEnabled(newState);
      persistentSearchStore.setValue(namespaceKey, "");
    }
  };

  constructor(props: SearchInputUrlProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  render() {
    const { searchUrlParam, persistentSearchStore, ...searchInputProps } = this.props;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <SearchInput
          value={this.inputVal}
          onChange={(val, event) => {
            this.setValue(val);
            this.props.onChange?.(val, event);
          }}
          onClear={this.clear}
          {...searchInputProps}
        />
        <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
          <Checkbox
            value={persistentSearchStore.isEnabled}
            onChange={this.togglePersistence}
            label="Persist"
            inline
          />
        </div>
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
      persistentSearchStore: di.inject(persistentSearchStoreInjectable),
      namespaceStore: canCreateStores ? di.inject(namespaceStoreInjectable) : undefined,
    };
  },
});
