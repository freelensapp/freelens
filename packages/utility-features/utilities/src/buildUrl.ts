/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import pathToRegexp from "path-to-regexp";
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
 * (`path-to-regexp` v1), where an optional parameter is written as `/:param?`.
 * The same engine matches them (`@freelensapp/routing`'s `matchPath`), so URLs
 * are built from the very same dialect here — no syntax translation needed.
 *
 * Segments are substituted verbatim (identity encoding), preserving the
 * behavior the project relied on under `path-to-regexp` v6. `pathToRegexp.compile`
 * would force `encodeURIComponent`, so the path is built from parsed tokens
 * directly to keep already-formed segments intact.
 */
function fillPath(path: string, params: Record<string, unknown>): string {
  let result = "";

  for (const token of pathToRegexp.parse(path)) {
    if (typeof token === "string") {
      result += token;
      continue;
    }

    const value = params[token.name];

    if (value == null) {
      if (token.optional) {
        continue;
      }

      throw new TypeError(`Expected "${token.name}" to be defined`);
    }

    result += token.prefix + String(value);
  }

  return result;
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
