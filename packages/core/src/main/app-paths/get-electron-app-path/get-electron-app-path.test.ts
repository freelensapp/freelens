/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { App } from "electron";
import electronAppInjectable from "../../electron-app/electron-app.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import getElectronAppPathInjectable from "./get-electron-app-path.injectable";

describe("get-electron-app-path", () => {
  let getElectronAppPath: (name: string) => string;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    const appStub = {
      name: "some-app-name",

      getPath: (name: string) => {
        if (name !== "some-existing-name") {
          throw new Error("irrelevant");
        }

        return "some-existing-app-path";
      },

      setPath: (_, __) => undefined,
    } as App;

    di.override(electronAppInjectable, () => appStub);

    getElectronAppPath = di.inject(getElectronAppPathInjectable) as (name: string) => string;
  });

  it("given app path exists, when called, returns app path", () => {
    const actual = getElectronAppPath("some-existing-name");

    expect(actual).toBe("some-existing-app-path");
  });

  it("given app path does not exist, when called, returns null", () => {
    const actual = getElectronAppPath("some-non-existing-name");

    expect(actual).toBe("");
  });
});
