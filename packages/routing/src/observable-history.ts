/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createPath, parsePath } from "history";
import { action, intercept, makeObservable, observable, reaction } from "mobx";
import { ObservableSearchParams } from "./observable-search-params";

import type { Action, Location, To } from "history";

import type { ObservableSearchParamsOptions } from "./observable-search-params";

/**
 * The native `history` v5 runtime surface the observable wrapper is built on.
 * Freelens injects a plain `history` v5 instance (`createBrowserHistory()` /
 * `createMemoryHistory()`), so `back`/`forward` replace v4's
 * `goBack`/`goForward` and `listen` receives a single `{ action, location }`
 * update object. The wrapper re-exposes the v4-style `goBack`/`goForward`/
 * `length` and two-argument `listen` to its own consumers (see below).
 */
export interface HistoryAdapter {
  readonly action: Action;
  readonly location: Location;
  push(to: To, state?: unknown): void;
  replace(to: To, state?: unknown): void;
  go(delta: number): void;
  back(): void;
  forward(): void;
  createHref(to: To): string;
  listen(listener: (update: { action: Action; location: Location }) => void): () => void;
}

export interface ObservableHistoryOptions {
  searchParams?: ObservableSearchParamsOptions;
}

// Native `history` methods with an unchanged v5 signature (`push`/`replace`/
// `go`/`createHref`) are forwarded to the underlying instance by the proxy in
// the constructor; declaration merging exposes them on the type. The v4-style
// members (`goBack`/`goForward`/`length`/two-argument `listen`) are defined
// explicitly on the class below. The generic `S` is retained for source
// compatibility with consumers that write `ObservableHistory<unknown>`
// (`history` v5 locations are no longer generic).
export interface ObservableHistory<S = unknown> {
  push(to: To, state?: unknown): void;
  replace(to: To, state?: unknown): void;
  go(delta: number): void;
  createHref(to: To): string;
}

/**
 * A mobx-observable wrapper around a `history` instance.
 *
 * In-house replacement for `mobx-observable-history` (abandoned upstream and
 * tied to `history` v4). It exposes an observable `location`/`action` pair and
 * an observable `searchParams`, keeps them in sync with the underlying history,
 * and forwards native history apis through a proxy so callers can keep using
 * `push`/`replace`/`goBack`/... directly on the observable instance.
 */
export class ObservableHistory<S = unknown> {
  protected opts: ObservableHistoryOptions;
  private readonly history: HistoryAdapter;
  protected unbindEvents: () => void;

  action: Action;
  location: Location;
  searchParams: ObservableSearchParams;

  constructor(history: HistoryAdapter, opts: ObservableHistoryOptions = {}) {
    makeObservable(this, {
      action: observable,
      location: observable,
      searchParams: observable.ref,
    });

    this.opts = opts;
    this.history = history;
    this.action = history.action;
    this.location = history.location;
    this.searchParams = new ObservableSearchParams(this.location.search, opts.searchParams);
    this.unbindEvents = this.bindEvents();

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        // Forward native history apis (push/replace/go/createHref) to the
        // underlying instance when they are not defined on the wrapper.
        if (!(prop in target)) {
          return Reflect.get(target.history, prop, target.history);
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  }

  /**
   * The number of entries in the history stack. `history` v5 dropped v4's
   * `length`; memory history still exposes `index`, so `index + 1` reproduces
   * the entry count that callers compare against, while browser/hash history
   * falls back to the DOM history length.
   */
  get length(): number {
    const history = this.history as HistoryAdapter & { index?: number };

    if (typeof history.index === "number") {
      return history.index + 1;
    }

    return globalThis.history?.length ?? 0;
  }

  /** Navigate to the previous entry. Bridges v4's `goBack` onto v5's `back`. */
  goBack(): void {
    this.history.back();
  }

  /** Navigate to the next entry. Bridges v4's `goForward` onto v5's `forward`. */
  goForward(): void {
    this.history.forward();
  }

  /**
   * Subscribe to location changes. Re-exposes the v4-style two-argument
   * `(location, action)` callback on top of v5's single `{ location, action }`
   * update object, so existing consumers keep working unchanged.
   */
  listen(listener: (location: Location, action: Action) => void): () => void {
    return this.history.listen(({ location, action }) => listener(location, action));
  }

  protected bindEvents(): () => void {
    const disposers = [
      // Normalize whole-location updates, e.g. `history.location = "/path?x="`.
      intercept(this, (change: any) => {
        if (change.type === "update" && change.name === "location") {
          change.newValue = this.normalize(change.newValue);
        }

        return change;
      }),

      // Normalize partial updates of `history.location.(search|hash) = string`.
      intercept(this.location as any, (change: any) => {
        if (change.type === "update") {
          if (change.name === "search") {
            change.newValue = this.normalize(change.newValue).search;
          }

          if (change.name === "hash") {
            change.newValue = this.normalize(change.newValue).hash;
          }
        }

        return change;
      }),

      // Sync `location.search` into the URLSearchParams helper.
      reaction(
        () => this.location.search,
        (search) => {
          const params = this.searchParams.toString({ withPrefix: true });

          if (search !== params) {
            this.searchParams.replace(search);
          }
        },
      ),

      // Sync URLSearchParams helper updates back into `location.search`.
      reaction(
        () => this.searchParams.toString({ withPrefix: true }),
        (search) => {
          if (this.location.search !== search) {
            this.location.search = search;
          }
        },
      ),

      // Push observable location changes onto the underlying history.
      reaction(
        () => createPath(this.location),
        (path) => {
          const currentPath = createPath(this.history.location);

          if (currentPath !== path) {
            this.history.push(path);
          }
        },
      ),

      // Sync updates coming from the underlying history native apis.
      this.history.listen(
        action(({ location, action: actionType }: { location: Location; action: Action }) => {
          this.action = actionType;
          this.location = this.normalize(location);
        }),
      ),
    ];

    return () => {
      disposers.forEach((dispose) => dispose());
    };
  }

  normalize(location: string | Partial<Location>, { skipEmpty = false }: { skipEmpty?: boolean } = {}): Location {
    let result: Partial<Location> = typeof location === "string" ? parsePath(location) : { ...location };

    if (result.search === "?") {
      result.search = "";
    }

    if (result.hash === "#") {
      result.hash = "";
    }

    if (skipEmpty) {
      result = Object.fromEntries(Object.entries(result).filter(([, value]) => !!value)) as Partial<Location>;
    }

    return result as Location;
  }

  merge(location: string | Partial<Location>, replace = false): void {
    const merged = { ...this.location, ...this.normalize(location) };

    if (replace) {
      this.history.replace(merged);
    } else {
      this.history.push(merged);
    }
  }

  destroy(): HistoryAdapter {
    this.unbindEvents?.();

    return this.history;
  }

  toString(): string {
    return createPath(this.location);
  }
}

export function createObservableHistory<S = unknown>(
  history: HistoryAdapter,
  opts?: ObservableHistoryOptions,
): ObservableHistory<S> {
  return new ObservableHistory<S>(history, opts);
}
