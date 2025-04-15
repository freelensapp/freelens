/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./namespace-select-filter.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import type { PlaceholderProps } from "react-select";
import { components } from "react-select";
import { Select } from "../select";
import type {
  NamespaceSelectFilterModel,
  NamespaceSelectFilterOption,
  SelectAllNamespaces,
} from "./namespace-select-filter-model/namespace-select-filter-model";
import namespaceSelectFilterModelInjectable from "./namespace-select-filter-model/namespace-select-filter-model.injectable";
import type { NamespaceStore } from "./store";
import namespaceStoreInjectable from "./store.injectable";

interface NamespaceSelectFilterProps {
  id: string;
}

interface Dependencies {
  model: NamespaceSelectFilterModel;
}

const NonInjectedNamespaceSelectFilter = observer(({ model, id }: Dependencies & NamespaceSelectFilterProps) => (
  <div
    onKeyUp={model.onKeyUp}
    onKeyDown={model.onKeyDown}
    onClick={model.onClick}
    className="NamespaceSelectFilterParent"
    data-testid="namespace-select-filter"
  >
    <Select<string | SelectAllNamespaces, NamespaceSelectFilterOption, true>
      id={id}
      isMulti={true}
      isClearable={false}
      menuIsOpen={model.menu.isOpen.get()}
      components={{ Placeholder }}
      closeMenuOnSelect={false}
      controlShouldRenderValue={false}
      onChange={model.onChange}
      onBlur={model.reset}
      formatOptionLabel={model.formatOptionLabel}
      options={model.options.get()}
      className="NamespaceSelect NamespaceSelectFilter"
      menuClass="NamespaceSelectFilterMenu"
      isOptionSelected={model.isOptionSelected}
      hideSelectedOptions={false}
    />
  </div>
));

export const NamespaceSelectFilter = withInjectables<Dependencies, NamespaceSelectFilterProps>(
  NonInjectedNamespaceSelectFilter,
  {
    getProps: (di, props) => ({
      model: di.inject(namespaceSelectFilterModelInjectable),
      ...props,
    }),
  },
);

export interface CustomPlaceholderProps extends PlaceholderProps<NamespaceSelectFilterOption, true> {}

interface PlaceholderDependencies {
  namespaceStore: NamespaceStore;
}

const NonInjectedPlaceholder = observer(
  ({ namespaceStore, ...props }: CustomPlaceholderProps & PlaceholderDependencies) => {
    const getPlaceholder = () => {
      const namespaces = namespaceStore.contextNamespaces;

      if (namespaceStore.areAllSelectedImplicitly || namespaces.length === 0) {
        return "All namespaces";
      }

      const prefix = namespaces.length === 1 ? "Namespace" : "Namespaces";

      return `${prefix}: ${namespaces.join(", ")}`;
    };

    return <components.Placeholder {...props}>{getPlaceholder()}</components.Placeholder>;
  },
);

const Placeholder = withInjectables<PlaceholderDependencies, CustomPlaceholderProps>(NonInjectedPlaceholder, {
  getProps: (di, props) => ({
    namespaceStore: di.inject(namespaceStoreInjectable),
    ...props,
  }),
});
