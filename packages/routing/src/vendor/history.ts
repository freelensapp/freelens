/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Vendored port of `history` v5.3.0.
 *
 * Upstream: https://github.com/remix-run/history/blob/v5.3.0/packages/history/index.ts
 * License:  MIT (c) React Training 2015-2019, (c) Remix Software 2020-2021
 *
 * `history` v5.3.0 was published in 2022-02 and remix-run/history is
 * effectively frozen -- React Router absorbed the code and develops it there.
 * The package nevertheless sat in `catalogs.extensions`, so every extension
 * author had to resolve an unmaintained package to compile against the API,
 * because `To`, `Location` and `History` reach it through `@freelensapp/icon`,
 * `renderer/ipc` and the drawer. Vendoring it is the same move as
 * `path-to-regexp` v1 in #2261: the routing contract stays put and we own the
 * code. See `docs/v2-routing-modernization.md`.
 *
 * Deliberately faithful to upstream so it can be diffed against v5.3.0. Only
 * the following changes were made:
 *   - converted to TypeScript with the declarations from upstream's
 *     `index.d.ts` inlined;
 *   - `createHashHistory` dropped -- nothing in Freelens creates a hash
 *     history;
 *   - navigation blocking dropped -- `block()`, `Blocker`, `Transition`, the
 *     `blockers` event list, `allowTx`, `blockedPopTx` and the `beforeunload`
 *     prompt. Nothing calls `block()`, and it is the bulk of what is left of
 *     the module. Dropping it makes `push`/`replace`/`go` unconditional, and
 *     `handlePop` reduces to `applyTx(Action.Pop)`;
 *   - the dev-only `warning()` helper dropped, along with the relative-pathname
 *     warnings it produced;
 *   - `readOnly` always freezes, rather than being an identity function in
 *     production builds.
 */

/**
 * Actions represent the type of change to a location value.
 */
export enum Action {
  /**
   * A POP indicates a change to an arbitrary index in the history stack, such
   * as a back or forward navigation. It does not describe the direction of the
   * navigation, only that the current index changed.
   *
   * Note: This is the default action for newly created history objects.
   */
  Pop = "POP",

  /**
   * A PUSH indicates a new entry being added to the history stack, such as when
   * a link is clicked and a new page loads. When this happens, all subsequent
   * entries in the stack are lost.
   */
  Push = "PUSH",

  /**
   * A REPLACE indicates the entry at the current index in the history stack
   * being replaced by a new one.
   */
  Replace = "REPLACE",
}

export type Pathname = string;
export type Search = string;
export type Hash = string;
export type Key = string;

/**
 * The pathname, search, and hash values of a URL.
 */
export interface Path {
  /**
   * A URL pathname, beginning with a /.
   */
  pathname: Pathname;

  /**
   * A URL search string, beginning with a ?.
   */
  search: Search;

  /**
   * A URL fragment identifier, beginning with a #.
   */
  hash: Hash;
}

/**
 * An entry in a history stack. A location contains information about the URL
 * path, as well as possibly some arbitrary state and a key.
 */
export interface Location extends Path {
  /**
   * A value of arbitrary data associated with this location.
   */
  state: unknown;

  /**
   * A unique string associated with this location. May be used to safely store
   * and retrieve data in some other storage API, like `localStorage`.
   */
  key: Key;
}

export type PartialPath = Partial<Path>;
export type PartialLocation = Partial<Location>;

/**
 * A change to the current location.
 */
export interface Update {
  /**
   * The action that triggered the change.
   */
  action: Action;

  /**
   * The new location.
   */
  location: Location;
}

/**
 * A function that receives notifications about location changes.
 */
export interface Listener {
  (update: Update): void;
}

/**
 * Describes a location that is the destination of some navigation, either via
 * `history.push` or `history.replace`. May be either a URL or the pieces of a
 * URL path.
 */
export type To = string | PartialPath;

/**
 * A history is an interface to the navigation stack. The history serves as the
 * source of truth for the current location, as well as provides a set of
 * methods that may be used to change it.
 */
export interface History {
  /**
   * The last action that modified the current location. This will always be
   * Action.Pop when a history instance is first created.
   */
  readonly action: Action;

  /**
   * The current location.
   */
  readonly location: Location;

  /**
   * Returns a valid href for the given `to` value that may be used as the value
   * of an <a href> attribute.
   */
  createHref(to: To): string;

  /**
   * Pushes a new location onto the history stack, increasing its length by one.
   * If there were any entries in the stack after the current one, they are lost.
   */
  push(to: To, state?: unknown): void;

  /**
   * Replaces the current location in the history stack with a new one. The
   * location that was replaced will no longer be available.
   */
  replace(to: To, state?: unknown): void;

  /**
   * Navigates `n` entries backward/forward in the history stack relative to the
   * current index.
   */
  go(delta: number): void;

  /**
   * Navigates to the previous entry in the stack.
   */
  back(): void;

  /**
   * Navigates to the next entry in the stack.
   */
  forward(): void;

  /**
   * Sets up a listener that will be called whenever the current location
   * changes. Returns a function that may be used to stop listening.
   */
  listen(listener: Listener): () => void;
}

/**
 * A browser history stores the current location in the normal URL in an actual
 * browser window.
 */
export interface BrowserHistory extends History {}

/**
 * A memory history stores locations in memory.
 */
export interface MemoryHistory extends History {
  readonly index: number;
}

export type BrowserHistoryOptions = { window?: Window };

export type InitialEntry = string | PartialLocation;

export type MemoryHistoryOptions = {
  initialEntries?: InitialEntry[];
  initialIndex?: number;
};

const readOnly = <T>(obj: T): T => Object.freeze(obj);

const PopStateEventType = "popstate";

interface HistoryState {
  usr: unknown;
  key: Key;
  idx: number;
}

/**
 * Browser history stores the location in regular URLs. This is the standard for
 * most web apps, but it requires some configuration on the server to ensure you
 * serve the same app at multiple URLs.
 */
export function createBrowserHistory(options: BrowserHistoryOptions = {}): BrowserHistory {
  const { window = document.defaultView as Window } = options;
  const globalHistory = window.history;

  function getIndexAndLocation(): [number, Location] {
    const { pathname, search, hash } = window.location;
    const state = (globalHistory.state || {}) as Partial<HistoryState>;

    return [
      state.idx as number,
      readOnly<Location>({
        pathname,
        search,
        hash,
        state: state.usr || null,
        key: state.key || "default",
      }),
    ];
  }

  function handlePop() {
    applyTx(Action.Pop);
  }

  window.addEventListener(PopStateEventType, handlePop);

  let action = Action.Pop;
  let [index, location] = getIndexAndLocation();
  const listeners = createEvents<Update>();

  if (index == null) {
    index = 0;
    globalHistory.replaceState({ ...globalHistory.state, idx: index }, "");
  }

  function createHref(to: To) {
    return typeof to === "string" ? to : createPath(to);
  }

  // state defaults to `null` because `window.history.state` does
  function getNextLocation(to: To, state: unknown = null): Location {
    return readOnly<Location>({
      pathname: location.pathname,
      hash: "",
      search: "",
      ...(typeof to === "string" ? parsePath(to) : to),
      state,
      key: createKey(),
    });
  }

  function getHistoryStateAndUrl(nextLocation: Location, index: number): [HistoryState, string] {
    return [
      {
        usr: nextLocation.state,
        key: nextLocation.key,
        idx: index,
      },
      createHref(nextLocation),
    ];
  }

  function applyTx(nextAction: Action) {
    action = nextAction;
    [index, location] = getIndexAndLocation();
    listeners.call({ action, location });
  }

  function push(to: To, state?: unknown) {
    const nextAction = Action.Push;
    const nextLocation = getNextLocation(to, state);
    const [historyState, url] = getHistoryStateAndUrl(nextLocation, index + 1);

    // TODO: Support forced reloading
    // try...catch because iOS limits us to 100 pushState calls :/
    try {
      globalHistory.pushState(historyState, "", url);
    } catch {
      // They are going to lose state here, but there is no real
      // way to warn them about it since the page will refresh...
      window.location.assign(url);
    }

    applyTx(nextAction);
  }

  function replace(to: To, state?: unknown) {
    const nextAction = Action.Replace;
    const nextLocation = getNextLocation(to, state);
    const [historyState, url] = getHistoryStateAndUrl(nextLocation, index);

    // TODO: Support forced reloading
    globalHistory.replaceState(historyState, "", url);
    applyTx(nextAction);
  }

  function go(delta: number) {
    globalHistory.go(delta);
  }

  const history: BrowserHistory = {
    get action() {
      return action;
    },
    get location() {
      return location;
    },
    createHref,
    push,
    replace,
    go,
    back() {
      go(-1);
    },
    forward() {
      go(1);
    },
    listen(listener) {
      return listeners.push(listener);
    },
  };

  return history;
}

/**
 * Memory history stores the current location in memory. It is designed for use
 * in stateful non-browser environments like tests and React Native.
 */
export function createMemoryHistory(options: MemoryHistoryOptions = {}): MemoryHistory {
  const { initialEntries = ["/"], initialIndex } = options;
  const entries: Location[] = initialEntries.map((entry) =>
    readOnly<Location>({
      pathname: "/",
      search: "",
      hash: "",
      state: null,
      key: createKey(),
      ...(typeof entry === "string" ? parsePath(entry) : entry),
    }),
  );
  let index = clamp(initialIndex == null ? entries.length - 1 : initialIndex, 0, entries.length - 1);
  let action = Action.Pop;
  let location = entries[index];
  const listeners = createEvents<Update>();

  function createHref(to: To) {
    return typeof to === "string" ? to : createPath(to);
  }

  function getNextLocation(to: To, state: unknown = null): Location {
    return readOnly<Location>({
      pathname: location.pathname,
      search: "",
      hash: "",
      ...(typeof to === "string" ? parsePath(to) : to),
      state,
      key: createKey(),
    });
  }

  function applyTx(nextAction: Action, nextLocation: Location) {
    action = nextAction;
    location = nextLocation;
    listeners.call({ action, location });
  }

  function push(to: To, state?: unknown) {
    const nextAction = Action.Push;
    const nextLocation = getNextLocation(to, state);

    index += 1;
    entries.splice(index, entries.length, nextLocation);
    applyTx(nextAction, nextLocation);
  }

  function replace(to: To, state?: unknown) {
    const nextAction = Action.Replace;
    const nextLocation = getNextLocation(to, state);

    entries[index] = nextLocation;
    applyTx(nextAction, nextLocation);
  }

  function go(delta: number) {
    const nextIndex = clamp(index + delta, 0, entries.length - 1);
    const nextAction = Action.Pop;
    const nextLocation = entries[nextIndex];

    index = nextIndex;
    applyTx(nextAction, nextLocation);
  }

  const history: MemoryHistory = {
    get index() {
      return index;
    },
    get action() {
      return action;
    },
    get location() {
      return location;
    },
    createHref,
    push,
    replace,
    go,
    back() {
      go(-1);
    },
    forward() {
      go(1);
    },
    listen(listener) {
      return listeners.push(listener);
    },
  };

  return history;
}

////////////////////////////////////////////////////////////////////////////////
// UTILS
////////////////////////////////////////////////////////////////////////////////

function clamp(n: number, lowerBound: number, upperBound: number) {
  return Math.min(Math.max(n, lowerBound), upperBound);
}

interface Events<A> {
  push(fn: (arg: A) => void): () => void;
  call(arg: A): void;
}

// Upstream's version also exposes `length`, which only ever served the blocker
// list that this port drops
function createEvents<A>(): Events<A> {
  let handlers: ((arg: A) => void)[] = [];

  return {
    push(fn) {
      handlers.push(fn);

      return function () {
        handlers = handlers.filter((handler) => handler !== fn);
      };
    },
    call(arg) {
      handlers.forEach((fn) => fn?.(arg));
    },
  };
}

function createKey() {
  return Math.random().toString(36).substr(2, 8);
}

/**
 * Creates a string URL path from the given pathname, search, and hash components.
 */
export function createPath({ pathname = "/", search = "", hash = "" }: PartialPath) {
  if (search && search !== "?") pathname += search.charAt(0) === "?" ? search : `?${search}`;
  if (hash && hash !== "#") pathname += hash.charAt(0) === "#" ? hash : `#${hash}`;

  return pathname;
}

/**
 * Parses a string URL path into its separate pathname, search, and hash components.
 */
export function parsePath(path: string): PartialPath {
  const parsedPath: PartialPath = {};

  if (path) {
    const hashIndex = path.indexOf("#");

    if (hashIndex >= 0) {
      parsedPath.hash = path.substr(hashIndex);
      path = path.substr(0, hashIndex);
    }

    const searchIndex = path.indexOf("?");

    if (searchIndex >= 0) {
      parsedPath.search = path.substr(searchIndex);
      path = path.substr(0, searchIndex);
    }

    if (path) {
      parsedPath.pathname = path;
    }
  }

  return parsedPath;
}
