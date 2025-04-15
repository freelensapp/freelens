/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import type { DiContainer } from "@ogre-tools/injectable";
import appEventBusInjectable from "../../common/app-event-bus/app-event-bus.injectable";
import electronUpdaterIsActiveInjectable from "../../main/electron-app/features/electron-updater-is-active.injectable";
import getBuildVersionInjectable from "../../main/electron-app/features/get-build-version.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { advanceFakeTime, testUsingFakeTime } from "../../test-utils/use-fake-time";
import periodicalCheckForUpdatesInjectable from "./child-features/periodical-checking-of-updates/main/periodical-check-for-updates.injectable";
import publishIsConfiguredInjectable from "./child-features/updating-is-enabled/main/publish-is-configured.injectable";
import type { CheckForPlatformUpdates } from "./main/check-for-updates/check-for-platform-updates/check-for-platform-updates.injectable";
import checkForPlatformUpdatesInjectable from "./main/check-for-updates/check-for-platform-updates/check-for-platform-updates.injectable";
import type { DownloadPlatformUpdate } from "./main/download-update/download-platform-update/download-platform-update.injectable";
import downloadPlatformUpdateInjectable from "./main/download-update/download-platform-update/download-platform-update.injectable";
import processCheckingForUpdatesInjectable from "./main/process-checking-for-updates.injectable";
import quitAndInstallUpdateInjectable from "./main/quit-and-install-update.injectable";

describe.skip("analytics for installing update", () => {
  let builder: ApplicationBuilder;
  let checkForPlatformUpdatesMock: AsyncFnMock<CheckForPlatformUpdates>;
  let downloadPlatformUpdateMock: AsyncFnMock<DownloadPlatformUpdate>;
  let analyticsListenerMock: jest.Mock;
  let mainDi: DiContainer;

  beforeEach(async () => {
    testUsingFakeTime("2015-10-21T07:28:00Z");

    builder = getApplicationBuilder();

    analyticsListenerMock = jest.fn();

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(getBuildVersionInjectable, () => () => "42.0.0");

      checkForPlatformUpdatesMock = asyncFn();

      mainDi.override(checkForPlatformUpdatesInjectable, () => checkForPlatformUpdatesMock);

      downloadPlatformUpdateMock = asyncFn();

      mainDi.override(downloadPlatformUpdateInjectable, () => downloadPlatformUpdateMock);
      mainDi.override(electronUpdaterIsActiveInjectable, () => true);

      mainDi.override(publishIsConfiguredInjectable, () => true);

      const eventBus = mainDi.inject(appEventBusInjectable);

      eventBus.addListener(analyticsListenerMock);
    });

    mainDi = builder.mainDi;
  });

  describe("given application is started and checking updates periodically", () => {
    beforeEach(async () => {
      mainDi.unoverride(periodicalCheckForUpdatesInjectable);
      mainDi.permitSideEffects(periodicalCheckForUpdatesInjectable);

      await builder.render();
    });

    it("sends event to analytics for being checked periodically", () => {
      expect(analyticsListenerMock).toHaveBeenCalledWith({
        name: "app",
        action: "checking-for-updates",

        params: {
          currentDateTime: "2015-10-21T07:28:00Z",
          source: "periodic",
        },
      });
    });

    it("when enough time passes to check for updates again, sends event to analytics for being checked periodically", () => {
      analyticsListenerMock.mockClear();

      advanceFakeTime(1000 * 60 * 60 * 2);

      expect(analyticsListenerMock).toHaveBeenCalledWith({
        name: "app",
        action: "checking-for-updates",

        params: {
          currentDateTime: "2015-10-21T09:28:00Z",
          source: "periodic",
        },
      });
    });
  });

  describe("when application is started", () => {
    beforeEach(async () => {
      analyticsListenerMock.mockClear();

      await builder.render();
    });

    it("sends event to analytics about the current version", () => {
      expect(analyticsListenerMock).toHaveBeenCalledWith({
        name: "app",
        action: "current-version",

        params: {
          version: "42.0.0",
          currentDateTime: "2015-10-21T07:28:00Z",
        },
      });
    });

    it("when checking for updates using tray, sends event to analytics for being checked from tray", async () => {
      analyticsListenerMock.mockClear();

      builder.tray.click("check-for-updates");

      expect(analyticsListenerMock.mock.calls).toEqual([
        [
          {
            name: "app",
            action: "checking-for-updates",

            params: {
              currentDateTime: "2015-10-21T07:28:00Z",
              source: "tray",
            },
          },
        ],
      ]);
    });

    it("when checking for updates using application menu, sends event to analytics for being checked from application menu", async () => {
      analyticsListenerMock.mockClear();

      builder.applicationMenu.click("root", "mac", "check-for-updates");

      expect(analyticsListenerMock.mock.calls).toEqual([
        [
          {
            name: "app",
            action: "checking-for-updates",

            params: {
              currentDateTime: "2015-10-21T07:28:00Z",
              source: "application-menu",
            },
          },
        ],
      ]);
    });

    describe("given checking for updates, when check for updates resolves with new update being available", () => {
      beforeEach(async () => {
        const processCheckingForUpdates = mainDi.inject(processCheckingForUpdatesInjectable);

        processCheckingForUpdates("irrelevant");

        analyticsListenerMock.mockClear();

        await checkForPlatformUpdatesMock.resolve({
          updateWasDiscovered: true,
          version: "43.0.0",
        });
      });

      it("sends event to analytics about new update being available", () => {
        expect(analyticsListenerMock.mock.calls).toEqual([
          [
            {
              name: "app",
              action: "update-was-discovered",

              params: {
                version: "43.0.0",
                currentDateTime: "2015-10-21T07:28:00Z",
              },
            },
          ],
        ]);
      });

      describe("given update is downloaded", () => {
        beforeEach(async () => {
          analyticsListenerMock.mockClear();

          await downloadPlatformUpdateMock.resolve({ downloadWasSuccessful: true });
        });

        describe("given checking for updates again", () => {
          beforeEach(() => {
            const processCheckingForUpdates = mainDi.inject(processCheckingForUpdatesInjectable);

            processCheckingForUpdates("irrelevant");

            analyticsListenerMock.mockClear();
          });

          it("when check resolves with same version that was previously downloaded, does not send event to analytics about update discovered", async () => {
            await checkForPlatformUpdatesMock.resolve({
              updateWasDiscovered: true,
              version: "43.0.0",
            });

            expect(analyticsListenerMock).not.toHaveBeenCalled();
          });

          it("when check resolves with different version that was previously downloaded, sends event to analytics about update discovered", async () => {
            await checkForPlatformUpdatesMock.resolve({
              updateWasDiscovered: true,
              version: "44.0.0",
            });

            expect(analyticsListenerMock.mock.calls).toEqual([
              [
                {
                  name: "app",
                  action: "update-was-discovered",

                  params: {
                    version: "44.0.0",
                    currentDateTime: "2015-10-21T07:28:00Z",
                  },
                },
              ],
            ]);
          });
        });

        it("does not send event to analytics about update downloaded being successful", () => {
          expect(analyticsListenerMock).not.toHaveBeenCalled();
        });

        it("when installing the update, sends event to analytics about installing the update", () => {
          const quitAndInstallUpdate = mainDi.inject(quitAndInstallUpdateInjectable);

          quitAndInstallUpdate();

          expect(analyticsListenerMock.mock.calls).toEqual([
            [
              {
                name: "app",
                action: "start-installing-update",

                params: {
                  version: "43.0.0",
                  currentDateTime: "2015-10-21T07:28:00Z",
                  updateChannel: "latest",
                },
              },
            ],
          ]);
        });
      });
    });
  });
});
