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
 * The `history` v4-compatible runtime surface the observable wrapper is built
 * on. Freelens injects a `history` v5 instance adapted back to this surface by
 * `toHistoryV4` (see `history-compat.ts`), which is why `listen` receives
 * `(location, action)` as two arguments and `goBack`/`goForward`/`length` exist.
 */
export interface HistoryAdapter {
  readonly action: Action;
  readonly location: Location;
  readonly length: number;
  push(to: To, state?: unknown): void;
  replace(to: To, state?: unknown): void;
  go(delta: number): void;
  goBack(): void;
  goForward(): void;
  createHref(to: To): string;
  listen(listener: (location: Location, action: Action) => void): () => void;
}

export interface ObservableHistoryOptions {
  searchParams?: ObservableSearchParamsOptions;
}

// Native `history` methods are forwarded to the underlying instance by the
// proxy in the constructor; declaration merging exposes them on the type. The
// generic `S` is retained for source compatibility with consumers that write
// `ObservableHistory<unknown>` (`history` v5 locations are no longer generic).
export interface ObservableHistory<S = unknown> {
  readonly length: number;
  push(to: To, state?: unknown): void;
  replace(to: To, state?: unknown): void;
  go(delta: number): void;
  goBack(): void;
  goForward(): void;
  createHref(to: To): string;
  listen(listener: (location: Location, action: Action) => void): () => void;
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
        // Forward native history apis (push/replace/goBack/...) to the
        // underlying instance when they are not defined on the wrapper.
        if (!(prop in target)) {
          return Reflect.get(target.history, prop, target.history);
        }

        return Reflect.get(target, prop, receiver);
      },
    });
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
        action((location: Location, actionType: Action) => {
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
