/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createContainer, getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import { beforeEach, describe, expect, it } from "vitest";
import { injectableDifferencingRegistratorWith } from "../registrator-helper";

import type { DiContainer } from "@ogre-tools/injectable";

const someToken = getInjectionToken<string>({ id: "some-token" });

// A new object on every call, as the sources of a registrator build them.
const toInjectables = (...ids: string[]) =>
  ids.map((id) =>
    getInjectable({
      id,
      instantiate: () => id,
      injectionToken: someToken,
    }),
  );

describe("injectableDifferencingRegistratorWith", () => {
  let di: DiContainer;
  let register: ReturnType<typeof injectableDifferencingRegistratorWith>;

  beforeEach(() => {
    di = createContainer("irrelevant");
    register = injectableDifferencingRegistratorWith(di);
  });

  it("registers the injectables of the first call", () => {
    register(toInjectables("a", "b"));

    expect(di.injectMany(someToken)).toEqual(["a", "b"]);
  });

  it("deregisters an injectable registered two calls before, from another object with its id", () => {
    register(toInjectables("a", "b"));
    register(toInjectables("a", "b"));
    register(toInjectables("a"));

    expect(di.injectMany(someToken)).toEqual(["a"]);
  });

  it("registers a new id and deregisters a removed one in the same call", () => {
    register(toInjectables("a", "b"));
    register(toInjectables("a", "b"));
    register(toInjectables("a", "c"));

    expect(di.injectMany(someToken)).toEqual(["a", "c"]);
  });

  it("registers an id again after it was deregistered", () => {
    register(toInjectables("a", "b"));
    register(toInjectables("a"));
    register(toInjectables("a", "b"));

    expect(di.injectMany(someToken)).toEqual(["a", "b"]);
  });

  it("keeps the registrations of one registrator apart from another's", () => {
    const registerOther = injectableDifferencingRegistratorWith(di);

    register(toInjectables("a"));
    registerOther(toInjectables("b"));
    register(toInjectables("a"));

    expect(di.injectMany(someToken)).toEqual(["a", "b"]);
  });
});
