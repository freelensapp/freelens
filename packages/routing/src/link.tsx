/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { parsePath } from "history";
import { observer } from "mobx-react";
import React from "react";
import { matchPath } from "./match-path";
import { observableHistoryInjectionToken } from "./observable-history.injectable";

import type { Location, To } from "history";

import type { Match } from "./match-path";
import type { ObservableHistory } from "./observable-history";

/**
 * In-house replacement for `react-router-dom` v5's `<Link>` / `<NavLink>`.
 *
 * `react-router` 5 is unmaintained and blocks the React 19 upgrade (see
 * `docs/v2-routing-modernization.md`). These components reproduce the small
 * `<Link>` / `<NavLink>` surface Freelens actually uses, driving navigation
 * through the in-house observable history (behind `observableHistoryInjectionToken`)
 * and computing the active state with the in-house `matchPath`, so the
 * `react-router-dom` import can be dropped from the call sites while behavior
 * stays identical.
 */

const isModifiedEvent = (event: React.MouseEvent): boolean =>
  Boolean(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

/**
 * Resolve a string `to` against the current location, matching `react-router`
 * v5: a `to` without an explicit pathname (e.g. `""` or a bare `?query`)
 * inherits the current pathname, so its `href` resolves to the current page
 * rather than to an empty string.
 */
const resolveHrefTarget = (to: To, currentPathname: string): To => {
  if (typeof to !== "string") {
    return to;
  }

  const parsed = parsePath(to);

  if (!parsed.pathname) {
    parsed.pathname = currentPathname;
  }

  return parsed;
};

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** The target location, in the same shape `react-router-dom` v5 accepts. */
  to: To;
  /** When `true`, replace the current entry instead of pushing a new one. */
  replace?: boolean;
}

interface LinkDependencies {
  history: ObservableHistory;
}

const NonInjectedLink = ({
  history,
  to,
  replace,
  onClick,
  target,
  ref,
  ...rest
}: LinkProps & LinkDependencies & { ref?: React.Ref<HTMLAnchorElement> }) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented && event.button === 0 && (!target || target === "_self") && !isModifiedEvent(event)) {
      event.preventDefault();

      if (replace) {
        history.replace(to);
      } else {
        history.push(to);
      }
    }
  };

  const href = history.createHref(resolveHrefTarget(to, history.location.pathname));

  return <a {...rest} ref={ref} href={href} target={target} onClick={handleClick} />;
};

NonInjectedLink.displayName = "NonInjectedLink";

// `NonInjectedLink` takes `ref` as a regular prop (React 19). `withInjectables`
// forwards it at runtime but types its result as `FunctionComponent<Props>`,
// which omits `ref`; annotate the export so call sites (e.g. `<Icon>`'s
// `NavLink`) can pass one.
export const Link = withInjectables<LinkDependencies, LinkProps>(NonInjectedLink, {
  getProps: (di, props) => ({
    ...props,
    history: di.inject(observableHistoryInjectionToken),
  }),
}) as unknown as React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;

Link.displayName = "Link";

export interface NavLinkProps extends LinkProps {
  /** When `true`, only match when the whole pathname matches. */
  exact?: boolean;
  /** When `true`, a trailing slash is significant when matching. */
  strict?: boolean;
  /** When `true`, matching is case sensitive. */
  sensitive?: boolean;
  /** Overrides the default match-based active computation. */
  isActive?: (match: Match | null, location: Location) => boolean;
  /** The class appended to `className` when the link is active. Defaults to `active`. */
  activeClassName?: string;
  /** The style merged into `style` when the link is active. */
  activeStyle?: React.CSSProperties;
  "aria-current"?: React.AriaAttributes["aria-current"];
}

interface NavLinkDependencies {
  history: ObservableHistory;
}

// `observer` returns the wrapped component's type verbatim, which has no
// `displayName` expando; a named function expression names it for React DevTools
// instead. `ref` is a regular prop under React 19, forwarded on to `<Link>`.
const NonInjectedNavLink = observer(function NonInjectedNavLink({
  history,
  to,
  exact = false,
  strict = false,
  sensitive = false,
  isActive: getIsActive,
  activeClassName = "active",
  activeStyle,
  className,
  style,
  "aria-current": ariaCurrent = "page",
  ref,
  ...rest
}: NavLinkProps & NavLinkDependencies & { ref?: React.Ref<HTMLAnchorElement> }) {
  const location = history.location;
  const path = typeof to === "string" ? to : to.pathname;
  // Match `react-router-dom` v5: escape the path so `matchPath` treats it as a
  // literal pattern rather than interpreting the target as a route schema.
  const escapedPath = path?.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
  const match = escapedPath ? matchPath(location.pathname, { path: escapedPath, exact, strict, sensitive }) : null;
  const isActive = Boolean(getIsActive ? getIsActive(match, location) : match);

  return (
    <Link
      {...rest}
      ref={ref}
      to={to}
      className={isActive ? [className, activeClassName].filter(Boolean).join(" ") : className}
      style={isActive && activeStyle ? { ...style, ...activeStyle } : style}
      aria-current={isActive ? ariaCurrent : undefined}
    />
  );
});

export const NavLink = withInjectables<NavLinkDependencies, NavLinkProps>(NonInjectedNavLink, {
  getProps: (di, props) => ({
    ...props,
    history: di.inject(observableHistoryInjectionToken),
  }),
}) as unknown as React.ForwardRefExoticComponent<NavLinkProps & React.RefAttributes<HTMLAnchorElement>>;

NavLink.displayName = "NavLink";
