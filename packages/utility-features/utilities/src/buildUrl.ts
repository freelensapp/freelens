/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isDefined } from "./type-narrowing";

/**
 * The subset of `react-router` v5's `RouteProps` that URL building relies on,
 * inlined so `@freelensapp/utilities` no longer depends on `react-router`
 * (dropped in the Phase 2 routing modernization; the route-schema dialect is
 * now owned in-house by `@freelensapp/routing`).
 */
export interface UrlRouteProps {
  path: string;
  exact?: boolean;
  strict?: boolean;
  sensitive?: boolean;
}

export interface URLParams<P extends object = {}, Q extends object = {}> {
  params?: P;
  query?: Q;
  fragment?: string;
}

/**
 * Route paths in this project are authored in the `react-router` v5 dialect
 * (`path-to-regexp` v1), where a `/`-prefixed parameter is written as `/:param`
 * and an optional one as `/:param?`. Front-end route paths never use inline
 * `(regex)` patterns (those live only in protocol/extension schemas, which are
 * matched, not built), so a small regex substitution over `/:name` and
 * `/:name?` is enough to build URLs — no `path-to-regexp` dependency needed.
 *
 * Segments are substituted verbatim (identity encoding), preserving the
 * behavior the project relied on: already-formed segments are kept intact
 * instead of being `encodeURIComponent`-escaped.
 */
function fillPath(path: string, params: Record<string, unknown>): string {
  return path.replace(/\/:(\w+)(\?)?/g, (_match, name: string, optional: string | undefined) => {
    const value = params[name];

    if (value == null) {
      if (optional) {
        return "";
      }

      throw new TypeError(`Expected "${name}" to be defined`);
    }

    return `/${String(value)}`;
  });
}

export function buildURL<P extends object = {}, Q extends object = {}>(
  path: string,
  { params, query, fragment }: URLParams<P, Q> = {},
) {
  const pathname = fillPath(String(path), (params ?? {}) as Record<string, unknown>);

  const queryParams = query ? new URLSearchParams(Object.entries(query)).toString() : "";
  const parts = [pathname, queryParams && `?${queryParams}`, fragment && `#${fragment}`];

  return parts.filter(isDefined).join("");
}

export function buildURLPositional<P extends object = {}, Q extends object = {}>(path: string) {
  return function (params?: P, query?: Q, fragment?: string): string {
    return buildURL(path, { params, query, fragment });
  };
}

export type UrlParamsFor<Pathname extends string> = Pathname extends `${string}/:${infer A}?/${infer Tail}`
  ? Partial<Record<A, string>> & UrlParamsFor<`/${Tail}`>
  : Pathname extends `${string}/:${infer A}/${infer Tail}`
    ? Record<A, string> & UrlParamsFor<`/${Tail}`>
    : Pathname extends `${string}/:${infer A}?`
      ? Partial<Record<A, string>>
      : Pathname extends `${string}/:${infer A}`
        ? Record<A, string>
        : {};

export interface UrlBuilder<Pathname extends string> {
  compile(params: UrlParamsFor<Pathname>, query?: object, fragment?: string): string;
}

export function urlBuilderFor<Pathname extends string>(pathname: Pathname): UrlBuilder<Pathname> {
  return {
    compile: buildURLPositional(pathname),
  };
}
