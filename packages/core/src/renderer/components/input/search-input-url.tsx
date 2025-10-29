/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import debounce from "lodash/debounce";
import { autorun, comparer, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { SearchInput } from "./search-input";
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

    // Sync inputVal with either persistent store or URL param
    disposeOnUnmount(this, [
      autorun(() => {
        if (persistentSearchStore.isEnabled) {
          const namespaceKey = this.getCurrentNamespaceKey();
          this.inputVal = persistentSearchStore.getValue(namespaceKey);
        } else {
          this.inputVal = searchUrlParam.get();
        }
      }),
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

            if (persistedValue) {
              searchUrlParam.set(persistedValue);
            }
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

  togglePersistence = () => {
    const { persistentSearchStore } = this.props;
    const newState = !persistentSearchStore.isEnabled;

    persistentSearchStore.setEnabled(newState);

    if (newState && this.inputVal) {
      // When enabling persistence, save current search value
      const namespaceKey = this.getCurrentNamespaceKey();
      persistentSearchStore.setValue(namespaceKey, this.inputVal);
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
        <label style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={persistentSearchStore.isEnabled}
            onChange={this.togglePersistence}
            title="Persist search across views"
          />
          <span style={{ fontSize: "12px", opacity: 0.8 }}>Persist</span>
        </label>
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
