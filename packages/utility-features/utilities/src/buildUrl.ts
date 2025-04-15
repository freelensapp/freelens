/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { compile } from "path-to-regexp";
import type { RouteProps } from "react-router";
import { isDefined } from "./type-narrowing";

export interface UrlRouteProps extends RouteProps {
  path: string;
}

export interface URLParams<P extends object = {}, Q extends object = {}> {
  params?: P;
  query?: Q;
  fragment?: string;
}

export function buildURL<P extends object = {}, Q extends object = {}>(
  path: string,
  { params, query, fragment }: URLParams<P, Q> = {},
) {
  const pathBuilder = compile(String(path));

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
