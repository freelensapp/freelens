/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export { compileRoutePath } from "./src/compile-route-path";
export { routingFeature } from "./src/feature";
export { historyInjectionToken } from "./src/history.injectable";
export { toHistoryV4 } from "./src/history-compat";
export { Link, NavLink } from "./src/link";
export { matchPath } from "./src/match-path";
export { createObservableHistory, ObservableHistory } from "./src/observable-history";
export { observableHistoryInjectionToken } from "./src/observable-history.injectable";
export { ObservableSearchParams } from "./src/observable-search-params";
export { searchParamsOptions } from "./src/search-params";

export type { LinkProps, NavLinkProps } from "./src/link";
export type { Match, MatchPathOptions } from "./src/match-path";
export type { HistoryAdapter, ObservableHistoryOptions } from "./src/observable-history";
export type { ObservableSearchParamsOptions, SearchParamsInit } from "./src/observable-search-params";
