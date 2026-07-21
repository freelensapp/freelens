/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { createPath } from "history";
import { observer } from "mobx-react";
import React from "react";
import { matchPath } from "./match-path";
import { observableHistoryInjectionToken } from "./observable-history.injectable";

import type { Location, To } from "history";

import type { Match } from "./match-path";
import type { ObservableHistory } from "./observable-history";

/**
 * In-house replacements for `react-router` v5's `<Route>` / `<Switch>` /
 * `<Redirect>`.
 *
 * `react-router` 5 is unmaintained and blocks the React 19 upgrade (see
 * `docs/v2-routing-modernization.md`). Freelens routes its primary view tree
 * through its own injectable route registry, so only a handful of declarative
 * react-router components remained (`<Switch>`/`<Route>` in `tab-layout.tsx`
 * plus a few `<Redirect>` sites). These components reproduce exactly that small
 * surface — first-match-wins `<Switch>` ordering, exact-vs-prefix `<Route>`
 * matching via the in-house `matchPath`, and `<Redirect>`'s navigate-on-mount
 * semantics — driving navigation and location through the in-house observable
 * history (behind `observableHistoryInjectionToken`), so the `react-router`
 * import can be dropped while behavior stays identical.
 */

/** Props handed to a `<Route>` `component` / `render` / function `children`. */
export interface RouteComponentProps {
  match: Match | null;
  location: Location;
  history: ObservableHistory;
}

export interface RouteProps {
  /** Path pattern(s) to match, in the `path-to-regexp` v1 dialect. */
  path?: string | string[];
  /** When `true`, the whole pathname must match. */
  exact?: boolean;
  /** When `true`, a trailing slash is significant. */
  strict?: boolean;
  /** When `true`, matching is case sensitive. */
  sensitive?: boolean;
  /** Component rendered when the route matches. */
  component?: React.ComponentType<any>;
  /** Render prop invoked when the route matches. */
  render?: (props: RouteComponentProps) => React.ReactNode;
  /** Static children, or a function invoked with the match on every render. */
  children?: ((props: RouteComponentProps) => React.ReactNode) | React.ReactNode;
  /** Location to match against; defaults to the current history location. */
  location?: Location;
  /** Internal: a match precomputed by an enclosing `<Switch>`. */
  computedMatch?: Match | null;
}

interface RouteDependencies {
  history: ObservableHistory;
}

/** A synthetic always-match for a `<Route>` without a `path` (mirrors RR5). */
const matchAll = (pathname: string): Match => ({
  path: "/",
  url: pathname,
  isExact: pathname === "/",
  params: {},
});

const NonInjectedRoute = observer((props: RouteProps & RouteDependencies) => {
  const { history, computedMatch, path, exact, strict, sensitive, component: Component, render, children } = props;
  const location = props.location ?? history.location;

  const match =
    computedMatch !== undefined
      ? computedMatch
      : path
        ? matchPath(location.pathname, { path, exact, strict, sensitive })
        : matchAll(location.pathname);

  const routeProps: RouteComponentProps = { match, location, history };

  if (typeof children === "function") {
    return <>{children(routeProps)}</>;
  }

  if (!match) {
    return null;
  }

  if (children !== undefined && children !== null && !(Array.isArray(children) && children.length === 0)) {
    return <>{children}</>;
  }

  if (Component) {
    return <Component {...routeProps} />;
  }

  if (render) {
    return <>{render(routeProps)}</>;
  }

  return null;
});

export const Route = withInjectables<RouteDependencies, RouteProps>(NonInjectedRoute, {
  getProps: (di, props) => ({
    ...props,
    history: di.inject(observableHistoryInjectionToken),
  }),
});

Route.displayName = "Route";

export interface SwitchProps {
  /** Location to match against; defaults to the current history location. */
  location?: Location;
  children?: React.ReactNode;
}

interface SwitchDependencies {
  history: ObservableHistory;
}

const NonInjectedSwitch = observer((props: SwitchProps & SwitchDependencies) => {
  const location = props.location ?? props.history.location;

  let element: React.ReactElement | null = null;
  let match: Match | null = null;

  // First-match-wins: iterate children in order and stop at the first whose
  // `path` (or `<Redirect>`'s `from`) matches; a child without either always
  // matches, which is how a trailing `<Redirect>` becomes the fallback.
  React.Children.forEach(props.children, (child) => {
    if (match === null && React.isValidElement(child)) {
      const childProps = child.props as RouteProps & { from?: string | string[] };
      const path = childProps.path ?? childProps.from;

      element = child;
      match = path
        ? matchPath(location.pathname, {
            path,
            exact: childProps.exact,
            strict: childProps.strict,
            sensitive: childProps.sensitive,
          })
        : matchAll(location.pathname);
    }
  });

  return match && element
    ? React.cloneElement(element, { location, computedMatch: match } as Partial<RouteProps>)
    : null;
});

export const Switch = withInjectables<SwitchDependencies, SwitchProps>(NonInjectedSwitch, {
  getProps: (di, props) => ({
    ...props,
    history: di.inject(observableHistoryInjectionToken),
  }),
});

Switch.displayName = "Switch";

export interface RedirectProps {
  /** The destination location. */
  to: To;
  /** When `true`, push a new entry instead of replacing the current one. */
  push?: boolean;
  /**
   * Accepted for `react-router` v5 compatibility. Only meaningful inside a
   * `<Switch>` (where the enclosing `<Switch>` uses it to decide whether this
   * redirect is selected); a standalone `<Redirect>` always redirects.
   */
  exact?: boolean;
  /** Accepted for `react-router` v5 compatibility; see {@link exact}. */
  from?: string;
  /** Internal: consumed by an enclosing `<Switch>`; ignored here. */
  computedMatch?: Match | null;
}

interface RedirectDependencies {
  history: ObservableHistory;
}

const NonInjectedRedirect = ({ history, to, push = false }: RedirectProps & RedirectDependencies) => {
  const target = typeof to === "string" ? to : createPath(to);

  // Mirror react-router v5's `<Redirect>`: navigate on mount, and again only
  // when the destination changes.
  React.useEffect(() => {
    if (push) {
      history.push(to);
    } else {
      history.replace(to);
    }
    // `to` is captured through the serialized `target`; `history` is a stable
    // singleton.
  }, [target, push]);

  return null;
};

NonInjectedRedirect.displayName = "NonInjectedRedirect";

export const Redirect = withInjectables<RedirectDependencies, RedirectProps>(NonInjectedRedirect, {
  getProps: (di, props) => ({
    ...props,
    history: di.inject(observableHistoryInjectionToken),
  }),
});

Redirect.displayName = "Redirect";
