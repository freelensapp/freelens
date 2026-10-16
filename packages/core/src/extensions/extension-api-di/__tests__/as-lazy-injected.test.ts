/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createContainer, getInjectable } from "@ogre-tools/injectable";
import { beforeEach, describe, expect, it } from "vitest";
import { asLazyInjectedForExtensionApi } from "../as-lazy-injected";
import { setDiForExtensionApi } from "../extension-api-di";

class SomeObject {
  constructor(readonly data: unknown) {}
}

class SomeApi {
  readonly objectConstructor = SomeObject;
  readonly name = "some-api";

  getName() {
    return this.name;
  }
}

const someApiInjectable = getInjectable({
  id: "some-api",
  instantiate: () => new SomeApi(),
});

describe("asLazyInjectedForExtensionApi", () => {
  let api: SomeApi;

  beforeEach(() => {
    const di = createContainer("as-lazy-injected-test");

    di.register(someApiInjectable);
    setDiForExtensionApi(di, "renderer");
    api = asLazyInjectedForExtensionApi(someApiInjectable);
  });

  it("binds a method to the injected instance", () => {
    const { getName } = api;

    expect(getName()).toBe("some-api");
  });

  it("returns a member that is a class as it is", () => {
    expect(api.objectConstructor).toBe(SomeObject);
  });

  it("allows constructing a member that is a class", () => {
    const object = new api.objectConstructor({ some: "data" });

    expect(object).toBeInstanceOf(SomeObject);
    expect(object.data).toEqual({ some: "data" });
  });
});
