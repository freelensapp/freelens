/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { namedCaptures } from "./named-captures";

describe("namedCaptures", () => {
  it("returns the named groups of a match", () => {
    expect(namedCaptures(/^(?<key>\w+)=(?<value>\w+)$/, "answer=42")).toEqual({ key: "answer", value: "42" });
  });

  it("returns undefined when there is no match", () => {
    expect(namedCaptures(/^(?<key>\w+)=(?<value>\w+)$/, "nope")).toBeUndefined();
  });

  it("leaves a group that did not participate undefined", () => {
    expect(namedCaptures(/^(?<name>[-\w]+)(@(?<version>\d+))?$/, "some-extension")).toEqual({
      name: "some-extension",
      version: undefined,
    });
  });

  it("answers the same way every time for a global regex", () => {
    // A regex kept at module scope is shared between calls, and `exec` on a
    // global one resumes from `lastIndex`. Without a reset the second call
    // here returns undefined.
    const global = /(?<word>\w+)/g;

    expect(namedCaptures(global, "hello")).toEqual({ word: "hello" });
    expect(namedCaptures(global, "hello")).toEqual({ word: "hello" });
    expect(namedCaptures(global, "hello")).toEqual({ word: "hello" });
  });

  it("answers the same way every time for a sticky regex", () => {
    const sticky = /(?<word>\w+)/y;

    expect(namedCaptures(sticky, "hello")).toEqual({ word: "hello" });
    expect(namedCaptures(sticky, "hello")).toEqual({ word: "hello" });
  });
});
