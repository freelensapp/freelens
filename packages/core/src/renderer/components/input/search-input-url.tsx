/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { withInjectables } from "@ogre-tools/injectable-react";
import debounce from "lodash/debounce";
import { comparer, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import namespaceStoreInjectable from "../namespaces/store.injectable";
import persistentSearchStoreInjectable from "./persistent-search-store.injectable";
import { SearchInput } from "./search-input";
import searchUrlPageParamInjectable from "./search-url-page-param.injectable";

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
  @observable private lastPlaceholder = "";
  private userTyping = false;

  readonly updateUrl = debounce((val: string) => this.props.searchUrlParam.set(val), 250);
  readonly updateStorage = debounce((storageKey: string, val: string) => {
    this.props.persistentSearchStore.setValue(storageKey, val);
    this.userTyping = false;
  }, 250);

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
    const { searchUrlParam, persistentSearchStore, placeholder } = this.props;

    // Initialize lastNamespaceKey and lastPlaceholder
    this.lastNamespaceKey = this.getCurrentNamespaceKey();
    this.lastPlaceholder = placeholder || "default";

    // On first mount, load the stored value and sync to URL
    const storageKey = this.getStorageKey();
    const storedValue = persistentSearchStore.getValue(storageKey);

    if (storedValue) {
      this.inputVal = storedValue;
      searchUrlParam.set(storedValue);
    } else {
      // If no stored value, check URL
      const urlValue = searchUrlParam.get();
      if (urlValue) {
        this.inputVal = urlValue;
      }
    }

    // Sync inputVal with either persistent store or URL param
    disposeOnUnmount(this, [
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          storageKey: this.getStorageKey(),
          persistedValue: persistentSearchStore.getValue(this.getStorageKey()),
          urlValue: searchUrlParam.get(),
          namespaceKey: this.getCurrentNamespaceKey(),
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
            this.inputVal = persistedValue;
            searchUrlParam.set(persistedValue);
          } else {
            // When persistence is disabled
            if (contextChanged) {
              // Load stored value for this specific placeholder+namespace or clear if none
              this.inputVal = persistedValue;
              searchUrlParam.set(persistedValue);
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
    ]);

    // When persistence is enabled and there's a persistent value, sync it to URL
    disposeOnUnmount(this, [
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          storageKey: this.getStorageKey(),
        }),
        ({ isEnabled, storageKey }) => {
          if (isEnabled) {
            const persistedValue = persistentSearchStore.getValue(storageKey);

            // Always sync to URL, even if empty (to clear filter when switching namespaces)
            searchUrlParam.set(persistedValue);
          }
        },
        { fireImmediately: true, equals: comparer.structural },
      ),
    ]);
  }

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

    if (newState) {
      // When enabling linking (switching to global shared):
      // 1. Save current search value to the global key FIRST
      // 2. Then enable persistence
      const globalKey = "global:linked";
      if (this.inputVal) {
        persistentSearchStore.setValue(globalKey, this.inputVal);
      }
      persistentSearchStore.setEnabled(newState);
    } else {
      // When disabling linking (switching to per-namespace per-placeholder):
      // 1. Disable persistence first
      // 2. Save current value to namespace+placeholder-specific key
      const currentValue = this.inputVal;
      persistentSearchStore.setEnabled(newState);
      const newStorageKey = this.getStorageKey(); // This will now be namespace+placeholder-specific
      if (currentValue) {
        persistentSearchStore.setValue(newStorageKey, currentValue);
      }
    }
  };

  constructor(props: SearchInputUrlProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  render() {
    const { searchUrlParam, persistentSearchStore, namespaceStore, ...searchInputProps } = this.props;

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
      persistentSearchStore: di.inject(persistentSearchStoreInjectable),
      namespaceStore: canCreateStores ? di.inject(namespaceStoreInjectable) : undefined,
    };
  },
});
