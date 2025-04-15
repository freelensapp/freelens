/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./list.scss";
import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import type { PageParam } from "../../../navigation/page-param";
import { Badge } from "../../badge";
import searchUrlPageParamInjectable from "../../input/search-url-page-param.injectable";
import { FilterIcon } from "../filter-icon";
import type { Filter, PageFiltersStore } from "./store";
import pageFiltersStoreInjectable from "./store.injectable";

export interface PageFiltersListProps {
  filters?: Filter[];
}

interface Dependencies {
  pageFiltersStore: PageFiltersStore;
  searchUrlParam: PageParam<string>;
}

const NonInjectedPageFiltersList = observer(
  ({ pageFiltersStore, searchUrlParam, filters: rawFilters }: Dependencies & PageFiltersListProps) => {
    const filters = rawFilters ?? pageFiltersStore.activeFilters;

    const reset = () => pageFiltersStore.reset();
    const remove = (filter: Filter) => {
      pageFiltersStore.removeFilter(filter);
      searchUrlParam.clear();
    };

    const renderContent = () => {
      if (filters.length === 0) {
        return null;
      }

      return (
        <>
          <div className="header flex gaps">
            <span>Currently applied filters:</span>
            <a onClick={reset} className="reset">
              Reset
            </a>
          </div>
          <div className="labels">
            {filters.map((filter) => {
              const { value, type } = filter;

              return (
                <Badge
                  key={`${type}-${value}`}
                  title={type}
                  className={cssNames("Badge flex gaps filter align-center", type)}
                  label={
                    <>
                      <FilterIcon type={type} />
                      <span className="value">{value}</span>
                      <Icon small material="close" onClick={() => remove(filter)} />
                    </>
                  }
                />
              );
            })}
          </div>
        </>
      );
    };

    return <div className="PageFiltersList">{renderContent()}</div>;
  },
);

export const PageFiltersList = withInjectables<Dependencies, PageFiltersListProps>(NonInjectedPageFiltersList, {
  getProps: (di, props) => ({
    ...props,
    pageFiltersStore: di.inject(pageFiltersStoreInjectable),
    searchUrlParam: di.inject(searchUrlPageParamInjectable),
  }),
});
