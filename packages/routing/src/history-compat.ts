/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Action, BrowserHistory, HashHistory, Location, MemoryHistory } from "history";

export type HistoryV5 = BrowserHistory | HashHistory | MemoryHistory;

type LegacyListener = (location: Location, action: Action) => void;

/**
 * Both `react-router` v5 and `mobx-observable-history` v2 are written against
 * the history v4 API. They call `history.goBack()`/`history.goForward()` and
 * expect the `listen` callback to receive `(location, action)` as two separate
 * arguments.
 *
 * history v5 renamed those navigation methods to `back()`/`forward()` and now
 * invokes listeners with a single `{ action, location }` update object.
 *
 * This proxy adapts a history v5 instance so it exposes the v4 runtime surface
 * that those consumers rely on, letting them keep working unchanged on top of
 * history v5. Everything else (`push`, `replace`, `location`, `action`,
 * `createHref`, ...) is passed through untouched.
 */
export function toHistoryV4<H extends HistoryV5>(history: H): H {
  return new Proxy(history, {
    get(target, property) {
      switch (property) {
        case "goBack":
          return () => target.back();
        case "goForward":
          return () => target.forward();
        case "listen":
          return (listener: LegacyListener) => target.listen(({ location, action }) => listener(location, action));
        case "length":
          // history v4 exposed `length`; v5 removed it. Memory history still
          // exposes `index`, so `index + 1` reproduces the entry count that
          // callers compare against; browser/hash history falls back to the
          // DOM history length, matching the history v4 behavior.
          if ("index" in target) {
            return (target as MemoryHistory).index + 1;
          }
          return globalThis.history?.length ?? 0;
        default:
          return Reflect.get(target, property);
      }
    },
  });
}
