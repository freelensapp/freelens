import asyncFn, { AsyncFnMock } from "@async-fn/jest";
import { registerFeature } from "@freelensapp/feature-core";
import { getPromiseStatus } from "@freelensapp/test-utils";
import { DiContainer, createContainer, getInjectable } from "@ogre-tools/injectable";
import { applicationFeature } from "../feature";
import { startApplicationInjectionToken } from "./start-application.injectable";
import * as timeSlots from "./time-slots";

describe("starting-of-application", () => {
  let di: DiContainer;

  let beforeApplicationIsLoadingMock: AsyncFnMock<() => Promise<void>>;
  let onLoadOfApplicationMock: AsyncFnMock<() => Promise<void>>;
  let afterApplicationIsLoadedMock: AsyncFnMock<() => Promise<void>>;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, applicationFeature);

    beforeApplicationIsLoadingMock = asyncFn();
    onLoadOfApplicationMock = asyncFn();
    afterApplicationIsLoadedMock = asyncFn();

    const beforeApplicationIsLoadingInjectable = getInjectable({
      id: "before-application-is-loading",
      instantiate: () => ({ run: beforeApplicationIsLoadingMock }),
      injectionToken: timeSlots.beforeApplicationIsLoadingInjectionToken,
    });

    const onLoadOfApplicationInjectable = getInjectable({
      id: "on-load-of-application",
      instantiate: () => ({ run: onLoadOfApplicationMock }),
      injectionToken: timeSlots.onLoadOfApplicationInjectionToken,
    });

    const afterApplicationIsLoadedInjectable = getInjectable({
      id: "after-application-is-loaded",
      instantiate: () => ({ run: afterApplicationIsLoadedMock }),
      injectionToken: timeSlots.afterApplicationIsLoadedInjectionToken,
    });

    di.register(
      beforeApplicationIsLoadingInjectable,
      onLoadOfApplicationInjectable,
      afterApplicationIsLoadedInjectable,
    );
  });

  describe("when application is started", () => {
    let actualPromise: Promise<void>;

    beforeEach(() => {
      const startApplication = di.inject(startApplicationInjectionToken);

      actualPromise = startApplication();
    });

    it("calls runnables registered in before application is loading", () => {
      expect(beforeApplicationIsLoadingMock).toHaveBeenCalled();
    });

    describe("when runnables in before application is loading resolve", () => {
      beforeEach(async () => {
        await beforeApplicationIsLoadingMock.resolve();
      });

      it("calls runnables registered in on load of application", () => {
        expect(onLoadOfApplicationMock).toHaveBeenCalled();
      });

      describe("when runnables in before application is loading resolve", () => {
        beforeEach(async () => {
          await onLoadOfApplicationMock.resolve();
        });

        it("calls runnables registered in after load of application", async () => {
          expect(afterApplicationIsLoadedMock).toHaveBeenCalled();
        });

        it("does not resolve yet", async () => {
          const promiseStatus = await getPromiseStatus(actualPromise);

          expect(promiseStatus.fulfilled).toBe(false);
        });

        it("when runnables in after application is loaded resolve, resolves", async () => {
          await afterApplicationIsLoadedMock.resolve();

          const promiseStatus = await getPromiseStatus(actualPromise);

          expect(promiseStatus.fulfilled).toBe(true);
        });
      });
    });
  });
});
