import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { registerFeature } from "@freelensapp/feature-core";
import { DiContainer, createContainer } from "@ogre-tools/injectable";
import { getPromiseStatus } from "@ogre-tools/test-utils";
import electronAppInjectable from "../electron/electron-app.injectable";
import { applicationFeatureForElectronMain } from "../feature";
import whenAppIsReadyInjectable from "./when-app-is-ready.injectable";

describe("when-app-is-ready", () => {
  let di: DiContainer;
  let whenReadyMock: AsyncFnMock<() => Promise<void>>;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, applicationFeatureForElectronMain);

    whenReadyMock = asyncFn();

    di.override(electronAppInjectable, () => ({ whenReady: whenReadyMock }) as unknown);
  });

  describe("when called", () => {
    let actualPromise: Promise<void>;

    beforeEach(() => {
      const whenAppIsReady = di.inject(whenAppIsReadyInjectable);

      actualPromise = whenAppIsReady();
    });

    it("does not resolve yet", async () => {
      const promiseStatus = await getPromiseStatus(actualPromise);

      expect(promiseStatus.fulfilled).toBe(false);
    });

    it("when app is ready, resolves", async () => {
      await whenReadyMock.resolve();

      const promiseStatus = await getPromiseStatus(actualPromise);

      expect(promiseStatus.fulfilled).toBe(true);
    });
  });
});
