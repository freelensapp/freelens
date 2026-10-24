/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TypedEmitter } from "./typed-event-emitter";

import type { TypedEventEmitter } from "./typed-event-emitter";

type TestEvents = {
  message: (from: string, content: string) => void;
  close: () => void;
};

describe("TypedEmitter", () => {
  let emitter: TypedEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEmitter<TestEvents>();
  });

  it("calls listeners synchronously, in registration order, with the arguments and the emitter as this", () => {
    const calls: unknown[] = [];

    emitter.on("message", function (this: unknown, from, content) {
      calls.push(["first", this, from, content]);
    });
    emitter.addListener("message", function (this: unknown, from, content) {
      calls.push(["second", this, from, content]);
    });

    emitter.emit("message", "alice", "hello");

    expect(calls).toEqual([
      ["first", emitter, "alice", "hello"],
      ["second", emitter, "alice", "hello"],
    ]);
  });

  it("returns from emit whether anything listened", () => {
    expect(emitter.emit("close")).toBe(false);

    emitter.on("close", () => {});

    expect(emitter.emit("close")).toBe(true);
    expect(emitter.emit("message", "alice", "hello")).toBe(false);
  });

  it("calls a listener added with once only on the first emit", () => {
    const listener = vi.fn();

    emitter.once("close", listener);
    emitter.emit("close");
    emitter.emit("close");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount("close")).toBe(0);
  });

  it("calls a listener added with once only once when a listener emits the same event again", () => {
    const listener = vi.fn();
    let nested = false;

    emitter.on("close", () => {
      if (!nested) {
        nested = true;
        emitter.emit("close");
      }
    });
    emitter.once("close", listener);
    emitter.emit("close");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("adds prepended listeners before the others", () => {
    const calls: string[] = [];

    emitter.on("close", () => calls.push("on"));
    emitter.prependListener("close", () => calls.push("prepend"));
    emitter.prependOnceListener("close", () => calls.push("prependOnce"));
    emitter.emit("close");
    emitter.emit("close");

    expect(calls).toEqual(["prependOnce", "prepend", "on", "prepend", "on"]);
  });

  it("removes a listener with off and removeListener", () => {
    const first = vi.fn();
    const second = vi.fn();

    emitter.on("close", first);
    emitter.on("close", second);
    emitter.off("close", first);
    emitter.emit("close");
    emitter.removeListener("close", second);
    emitter.emit("close");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("removes only the most recently added copy of a listener added twice", () => {
    const calls: string[] = [];
    const listener = () => calls.push("listener");

    emitter.on("close", listener);
    emitter.on("close", () => calls.push("other"));
    emitter.on("close", listener);
    emitter.off("close", listener);
    emitter.emit("close");

    expect(calls).toEqual(["listener", "other"]);
  });

  it("removes a listener added with once by the listener itself", () => {
    const listener = vi.fn();

    emitter.once("close", listener);
    emitter.off("close", listener);
    emitter.emit("close");

    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores removing a listener that was never added", () => {
    emitter.on("close", () => {});

    expect(emitter.off("close", () => {})).toBe(emitter);
    expect(emitter.off("message", () => {})).toBe(emitter);
    expect(emitter.listenerCount("close")).toBe(1);
  });

  it("does not change which listeners an emit calls when a listener adds or removes one", () => {
    const calls: string[] = [];
    const removed = () => calls.push("removed");

    emitter.on("close", () => {
      calls.push("first");
      emitter.off("close", removed);
      emitter.on("close", () => calls.push("added"));
    });
    emitter.on("close", removed);
    emitter.emit("close");

    expect(calls).toEqual(["first", "removed"]);
  });

  it("stops at a listener that throws and rethrows its error", () => {
    const after = vi.fn();

    emitter.on("close", () => {
      throw new Error("boom");
    });
    emitter.on("close", after);

    expect(() => emitter.emit("close")).toThrow("boom");
    expect(after).not.toHaveBeenCalled();
  });

  it("removes all listeners of one event or of every event", () => {
    emitter.on("close", () => {});
    emitter.on("message", () => {});
    emitter.removeAllListeners("close");

    expect(emitter.eventNames()).toEqual(["message"]);

    emitter.on("close", () => {});
    emitter.removeAllListeners();

    expect(emitter.eventNames()).toEqual([]);
  });

  it("lists listeners, raw listeners, their count and the events that have any", () => {
    const listener = () => {};
    const onceListener = () => {};

    emitter.on("close", listener);
    emitter.once("close", onceListener);

    expect(emitter.listeners("close")).toEqual([listener, onceListener]);
    expect(emitter.rawListeners("close")).toHaveLength(2);
    expect(emitter.rawListeners("close")[0]).toBe(listener);
    expect(emitter.rawListeners("close")[1]).not.toBe(onceListener);
    expect(emitter.listenerCount("close")).toBe(2);
    expect(emitter.listenerCount("message")).toBe(0);
    expect(emitter.listeners("message")).toEqual([]);
    expect(emitter.eventNames()).toEqual(["close"]);

    emitter.emit("close");

    expect(emitter.listeners("close")).toEqual([listener]);

    emitter.off("close", listener);

    expect(emitter.eventNames()).toEqual([]);
  });

  it("stores the maximum number of listeners", () => {
    expect(emitter.getMaxListeners()).toBe(10);
    expect(emitter.setMaxListeners(20)).toBe(emitter);
    expect(emitter.getMaxListeners()).toBe(20);
  });

  it("returns the emitter from the methods that chain", () => {
    const listener = () => {};

    expect(emitter.on("close", listener)).toBe(emitter);
    expect(emitter.addListener("close", listener)).toBe(emitter);
    expect(emitter.once("close", listener)).toBe(emitter);
    expect(emitter.prependListener("close", listener)).toBe(emitter);
    expect(emitter.prependOnceListener("close", listener)).toBe(emitter);
    expect(emitter.off("close", listener)).toBe(emitter);
    expect(emitter.removeListener("close", listener)).toBe(emitter);
    expect(emitter.removeAllListeners("close")).toBe(emitter);
    expect(emitter.removeAllListeners()).toBe(emitter);
  });

  it("can be extended", () => {
    class Chat extends TypedEmitter<TestEvents> {
      send(content: string) {
        return this.emit("message", "me", content);
      }
    }

    const chat = new Chat();
    const listener = vi.fn();

    chat.on("message", listener);

    expect(chat.send("hello")).toBe(true);
    expect(listener).toHaveBeenCalledWith("me", "hello");
  });

  it("calls listeners in the same order as node:events for the same sequence of calls", () => {
    const run = (target: TypedEventEmitter<TestEvents>) => {
      const calls: string[] = [];
      const listener = (name: string) => () => {
        calls.push(name);
      };
      const a = listener("a");
      const b = listener("b");
      const c = listener("c");

      target.on("close", a);
      target.once("close", b);
      target.prependListener("close", c);
      target.prependOnceListener("close", a);
      target.on("close", b);
      target.on("close", () => {
        calls.push("mutating");
        target.off("close", b);
        target.on("close", listener("late"));
      });
      calls.push(`emit:${target.emit("close")}`);
      target.off("close", a);
      calls.push(`emit:${target.emit("close")}`);
      calls.push(`count:${target.listenerCount("close")}`);
      target.removeAllListeners("close");
      calls.push(`emit:${target.emit("close")}`);

      return calls;
    };

    expect(run(new TypedEmitter<TestEvents>())).toEqual(
      run(new EventEmitter() as unknown as TypedEventEmitter<TestEvents>),
    );
  });
});
