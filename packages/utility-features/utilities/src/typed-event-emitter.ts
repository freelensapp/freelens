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
 * This is a purely structural type; it does not provide an implementation. Use
 * it by casting an `EventEmitter`:
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
