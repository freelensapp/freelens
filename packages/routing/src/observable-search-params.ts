/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action, makeObservable, observable } from "mobx";

export interface ObservableSearchParamsOptions {
  /** Skip empty params, e.g. "?x=&y=2" becomes "?y=2". */
  skipEmpty?: boolean;
  /** Join multiple params with the same name, e.g. "?x=1&x=2" becomes "?x=1,2". */
  joinArrays?: boolean;
  /** Value splitter used when {@link joinArrays} is enabled. */
  joinArraysWith?: string;
}

export type SearchParamsInit = string | Record<string, string> | URLSearchParams;

// Instances behave like a native `URLSearchParams`; declaration merging exposes
// that surface on the type while the class only overrides the mobx-aware bits.
export interface ObservableSearchParams extends URLSearchParams {}

/**
 * A mobx-observable wrapper around `URLSearchParams`.
 *
 * This is an in-house replacement for the `ObservableSearchParams` from the
 * abandoned `mobx-observable-history` package. It keeps an observable `search`
 * string in sync with a backing `URLSearchParams`, and forwards every native
 * `URLSearchParams` mutation (e.g. `set`, `append`, `delete`) through a proxy so
 * observers are notified whenever the query string changes.
 */
export class ObservableSearchParams {
  protected opts: ObservableSearchParamsOptions;
  protected search = "";
  protected searchParams: URLSearchParams;

  constructor(init?: SearchParamsInit, opts: ObservableSearchParamsOptions = {}) {
    makeObservable<ObservableSearchParams, "search" | "searchParams">(this, {
      search: observable,
      searchParams: observable.ref,
      replace: action,
      deleteAll: action,
    });

    this.opts = { skipEmpty: true, joinArrays: false, joinArraysWith: ",", ...opts };
    this.search = this.normalize(init);
    this.searchParams = new URLSearchParams(init);

    return new Proxy(this, {
      getPrototypeOf() {
        return URLSearchParams.prototype;
      },
      get: (target, prop, receiver) => {
        // Forward native `URLSearchParams` apis that are not defined on this
        // wrapper, reacting to any mutation so `search` stays authoritative.
        if (!(prop in target)) {
          const nativeRef = Reflect.get(target.searchParams, prop, target.searchParams);

          if (typeof nativeRef === "function") {
            return (...args: unknown[]) => {
              const oldValue = target.searchParams.toString();
              const result = Reflect.apply(nativeRef, target.searchParams, args);
              const newValue = target.searchParams.toString();

              if (oldValue !== newValue) {
                target.replace(newValue);
              }

              return result;
            };
          }

          return nativeRef;
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  }

  normalize(search: SearchParamsInit = ""): string {
    const { joinArrays, joinArraysWith = ",", skipEmpty } = this.opts;
    const params: Record<string, string[]> = {};
    const normalizedParams: [string, string][] = [];

    Array.from(new URLSearchParams(search)).forEach(([param, value]) => {
      if (skipEmpty && !value) {
        return;
      }

      const values = joinArrays ? value.split(joinArraysWith) : [value];

      params[param] ??= [];
      params[param].push(...values);
    });

    Object.entries(params).forEach(([name, values]) => {
      if (joinArrays) {
        normalizedParams.push([name, values.join(joinArraysWith)]);
      } else {
        normalizedParams.push(...values.map((value): [string, string] => [name, value]));
      }
    });

    return new URLSearchParams(normalizedParams).toString();
  }

  replace(search: SearchParamsInit): void {
    const normalized = this.normalize(search);

    if (this.search !== normalized) {
      this.search = normalized;
      this.searchParams = new URLSearchParams(normalized);
    }
  }

  merge(search: SearchParamsInit): void {
    this.replace(`${this.search}&${this.normalize(search)}`);
  }

  deleteAll(): void {
    this.search = "";
    Array.from(this.searchParams.keys()).forEach((key) => {
      this.searchParams.delete(key);
    });
  }

  getAll(param: string): string[] {
    const values = this.searchParams.getAll(param);
    const { joinArrays, joinArraysWith = "," } = this.opts;

    if (joinArrays) {
      return values.flatMap((value) => value.split(joinArraysWith));
    }

    return values;
  }

  toString({ withPrefix = false }: { withPrefix?: boolean } = {}): string {
    if (!this.search) {
      return "";
    }

    return `${withPrefix ? "?" : ""}${this.search}`;
  }
}
