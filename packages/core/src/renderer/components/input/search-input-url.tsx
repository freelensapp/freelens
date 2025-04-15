/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import debounce from "lodash/debounce";
import { autorun, makeObservable, observable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { PageParam } from "../../navigation/page-param";
import type { InputProps } from "./input";
import { SearchInput } from "./search-input";
import searchUrlPageParamInjectable from "./search-url-page-param.injectable";

export interface SearchInputUrlProps extends InputProps {
  compact?: boolean; // show only search-icon when not focused
}

interface Dependencies {
  searchUrlParam: PageParam<string>;
}

@observer
class NonInjectedSearchInputUrl extends React.Component<SearchInputUrlProps & Dependencies> {
  @observable inputVal = ""; // fix: use empty string on init to avoid react warnings

  readonly updateUrl = debounce((val: string) => this.props.searchUrlParam.set(val), 250);

  componentDidMount(): void {
    disposeOnUnmount(this, [autorun(() => (this.inputVal = this.props.searchUrlParam.get()))]);
  }

  setValue = (value: string) => {
    this.inputVal = value;
    this.updateUrl(value);
  };

  clear = () => {
    this.setValue("");
    this.updateUrl.flush();
  };

  onChange = (val: string, evt: React.ChangeEvent<any>) => {
    this.setValue(val);
    this.props.onChange?.(val, evt);
  };

  constructor(props: SearchInputUrlProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  render() {
    const { searchUrlParam, ...searchInputProps } = this.props;

    return (
      <SearchInput
        value={this.inputVal}
        onChange={(val, event) => {
          this.setValue(val);
          this.props.onChange?.(val, event);
        }}
        onClear={this.clear}
        {...searchInputProps}
      />
    );
  }
}

export const SearchInputUrl = withInjectables<Dependencies, SearchInputUrlProps>(NonInjectedSearchInputUrl, {
  getProps: (di, props) => ({
    ...props,
    searchUrlParam: di.inject(searchUrlPageParamInjectable),
  }),
});
