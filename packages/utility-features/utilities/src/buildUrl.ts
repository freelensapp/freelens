/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { compile } from "path-to-regexp";
import { isDefined } from "./type-narrowing";

import type { RouteProps } from "react-router";

export interface UrlRouteProps extends RouteProps {
  path: string;
}

export interface URLParams<P extends object = {}, Q extends object = {}> {
  params?: P;
  query?: Q;
  fragment?: string;
}

/**
 * Route paths in this project are authored in the `react-router` v5 dialect
 * (which still bundles `path-to-regexp` v1), where an optional parameter is
 * written as `/:param?`. Since v8, `path-to-regexp` expresses the same thing as
 * an optional group `{/:param}` and throws on the trailing `?` modifier.
 *
 * As the very same path strings are shared with `react-router` for matching,
 * they must stay in the v5 dialect; convert them to the v8 dialect here, at the
 * only boundary where `path-to-regexp` v8 compiles them.
 */
function toPathToRegexpSyntax(path: string): string {
  return path.replace(/\/(:[A-Za-z0-9_]+)\?/g, "{/$1}");
}

export function buildURL<P extends object = {}, Q extends object = {}>(
  path: string,
  { params, query, fragment }: URLParams<P, Q> = {},
) {
  // `encode: false` keeps the identity encoding that `path-to-regexp` v6 used by
  // default, so already-formed path segments are emitted verbatim.
  const pathBuilder = compile(toPathToRegexpSyntax(String(path)), { encode: false });

  const queryParams = query ? new URLSearchParams(Object.entries(query)).toString() : "";
  const parts = [pathBuilder(params), queryParams && `?${queryParams}`, fragment && `#${fragment}`];

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
