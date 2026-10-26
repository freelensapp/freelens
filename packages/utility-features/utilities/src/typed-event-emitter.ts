/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * A map of event names to the signatures of their listeners.
 */
export type EventMap = Record<string, (...args: never[]) => void>;

/**
 * A type-safe view of `node:events`' `EventEmitter`, in which the event names
 * are restricted to the keys of `Events` and each listener is typed by the
 * corresponding entry.
 *
 * {@link TypedEmitter} implements it without Node. To type a `node:events`
 * `EventEmitter` instead, cast it:
 *
 * ```typescript
 * type MyEvents = {
 *   error: (error: Error) => void;
 *   message: (from: string, content: string) => void;
 * };
 *
 * const emitter = new EventEmitter() as unknown as TypedEventEmitter<MyEvents>;
 *
 * emitter.emit("error", "not an Error"); // <- type error
 * ```
 *
 * The cast is needed because `EventEmitter` declares the same method names with
 * wider signatures, which are not assignable to the narrowed ones.
 *
 * The extension API does not export this interface, so an extension cannot
 * name it; it extends `Common.Util.TypedEmitter` instead.
 *
 * Replaces the `typed-emitter` package, which was last released in 2022-01 and
 * only ever contained declarations.
 */
export interface TypedEventEmitter<Events extends EventMap> {
  addListener<E extends keyof Events>(event: E, listener: Events[E]): this;
  on<E extends keyof Events>(event: E, listener: Events[E]): this;
  once<E extends keyof Events>(event: E, listener: Events[E]): this;
  prependListener<E extends keyof Events>(event: E, listener: Events[E]): this;
  prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]): this;

  off<E extends keyof Events>(event: E, listener: Events[E]): this;
  removeListener<E extends keyof Events>(event: E, listener: Events[E]): this;
  removeAllListeners<E extends keyof Events>(event?: E): this;

  emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): boolean;

  /**
   * The return type is deliberately wider than `(keyof Events)[]` so that this
   * interface stays compatible with `EventEmitter.eventNames()`.
   */
  eventNames(): (keyof Events | string | symbol)[];
  listeners<E extends keyof Events>(event: E): Events[E][];
  rawListeners<E extends keyof Events>(event: E): Events[E][];
  listenerCount<E extends keyof Events>(event: E): number;

  getMaxListeners(): number;
  setMaxListeners(maxListeners: number): this;
}

type Listener = (...args: never[]) => void;

/**
 * A listener as stored: either the listener itself or, for `once`, a wrapper
 * that remembers the listener it wraps so that it can be removed by it.
 */
type StoredListener = Listener & { readonly listener?: Listener };

/**
 * An implementation of {@link TypedEventEmitter} that does not need Node, for
 * events that are emitted and handled in the same process.
 *
 * It behaves like `node:events`' `EventEmitter` for the members it declares:
 * listeners are called synchronously, in registration order, with the emitter
 * as `this`; a listener added or removed during an `emit` does not change which
 * listeners that `emit` calls; `off` removes the most recently added matching
 * listener, including one added by `once`.
 *
 * Unlike `EventEmitter`, it emits no `newListener` or `removeListener` events,
 * gives an `error` event no special meaning, and does not warn when the
 * maximum number of listeners is exceeded: `setMaxListeners` only stores the
 * value that `getMaxListeners` returns.
 *
 * ```typescript
 * import { Common } from "@freelensapp/extensions";
 *
 * type MyEvents = {
 *   message: (from: string, content: string) => void;
 * };
 *
 * class Chat extends Common.Util.TypedEmitter<MyEvents> {}
 * ```
 */
export class TypedEmitter<Events extends EventMap> implements TypedEventEmitter<Events> {
  readonly #listenersByEvent = new Map<keyof Events, StoredListener[]>();
  #maxListeners = 10;

  addListener<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.#add(event, listener, false);
  }

  on<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.#add(event, listener, false);
  }

  once<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.#add(event, this.#wrapOnce(event, listener), false);
  }

  prependListener<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.#add(event, listener, true);
  }

  prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.#add(event, this.#wrapOnce(event, listener), true);
  }

  off<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.removeListener(event, listener);
  }

  removeListener<E extends keyof Events>(event: E, listener: Events[E]): this {
    const listeners = this.#listenersByEvent.get(event);

    if (listeners) {
      const index = listeners.findLastIndex((stored) => stored === listener || stored.listener === listener);

      if (index !== -1) {
        listeners.splice(index, 1);

        if (listeners.length === 0) {
          this.#listenersByEvent.delete(event);
        }
      }
    }

    return this;
  }

  removeAllListeners<E extends keyof Events>(event?: E): this {
    if (event === undefined) {
      this.#listenersByEvent.clear();
    } else {
      this.#listenersByEvent.delete(event);
    }

    return this;
  }

  emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): boolean {
    const listeners = this.#listenersByEvent.get(event);

    if (!listeners) {
      return false;
    }

    for (const listener of [...listeners]) {
      Reflect.apply(listener, this, args);
    }

    return true;
  }

  eventNames(): (keyof Events)[] {
    return [...this.#listenersByEvent.keys()];
  }

  listeners<E extends keyof Events>(event: E): Events[E][] {
    return (this.#listenersByEvent.get(event) ?? []).map((stored) => stored.listener ?? stored) as Events[E][];
  }

  rawListeners<E extends keyof Events>(event: E): Events[E][] {
    return [...(this.#listenersByEvent.get(event) ?? [])] as Events[E][];
  }

  listenerCount<E extends keyof Events>(event: E): number {
    return this.#listenersByEvent.get(event)?.length ?? 0;
  }

  getMaxListeners(): number {
    return this.#maxListeners;
  }

  setMaxListeners(maxListeners: number): this {
    this.#maxListeners = maxListeners;

    return this;
  }

  #add(event: keyof Events, listener: StoredListener, prepend: boolean): this {
    const listeners = this.#listenersByEvent.get(event);

    if (!listeners) {
      this.#listenersByEvent.set(event, [listener]);
    } else if (prepend) {
      listeners.unshift(listener);
    } else {
      listeners.push(listener);
    }

    return this;
  }

  #wrapOnce<E extends keyof Events>(event: E, listener: Events[E]): StoredListener {
    let fired = false;

    // The flag covers an `emit` that already copied the listeners when the
    // wrapper was removed by a nested `emit` of the same event.
    const wrapper = Object.assign(
      (...args: never[]) => {
        if (!fired) {
          fired = true;
          this.removeListener(event, wrapper as unknown as Events[E]);
          Reflect.apply(listener, this, args);
        }
      },
      { listener },
    );

    return wrapper;
  }
}
