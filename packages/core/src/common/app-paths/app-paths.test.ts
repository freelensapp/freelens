/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DiContainer } from "@ogre-tools/injectable";
import directoryForIntegrationTestingInjectable from "../../main/app-paths/directory-for-integration-testing/directory-for-integration-testing.injectable";
import getElectronAppPathInjectable from "../../main/app-paths/get-electron-app-path/get-electron-app-path.injectable";
import setElectronAppPathInjectable from "../../main/app-paths/set-electron-app-path/set-electron-app-path.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { AppPaths } from "./app-path-injection-token";
import type { PathName } from "./app-path-names";
import appPathsInjectable from "./app-paths.injectable";

describe("app-paths", () => {
  let builder: ApplicationBuilder;

  beforeEach(() => {
    builder = getApplicationBuilder();

    const defaultAppPathsStub: AppPaths = {
      currentApp: "/some-current-app",
      appData: "/some-app-data",
      crashDumps: "/some-crash-dumps",
      desktop: "/some-desktop",
      documents: "/some-documents",
      downloads: "/some-downloads",
      exe: "/some-exe",
      home: "/some-home-path",
      logs: "/some-logs",
      module: "/some-module",
      music: "/some-music",
      pictures: "/some-pictures",
      recent: "/some-recent",
      temp: "/some-temp",
      videos: "/some-videos",
      userData: "/some-irrelevant-user-data",
      sessionData: "/some-irrelevant-user-data", //  By default this points to userData
    };

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(
        getElectronAppPathInjectable,
        () =>
          (key: PathName): string | null =>
            defaultAppPathsStub[key],
      );

      mainDi.override(setElectronAppPathInjectable, () => (key: PathName, path: string): void => {
        defaultAppPathsStub[key] = path;
      });
    });
  });

  describe("normally", () => {
    let windowDi: DiContainer;
    let mainDi: DiContainer;

    beforeEach(async () => {
      await builder.render();

      windowDi = builder.applicationWindow.only.di;
      mainDi = builder.mainDi;
    });

    it("given in renderer, when injecting app paths, returns application specific app paths", () => {
      const actual = windowDi.inject(appPathsInjectable);

      expect(actual).toEqual({
        currentApp: "/some-current-app",
        appData: "/some-app-data",
        crashDumps: "/some-crash-dumps",
        desktop: "/some-desktop",
        documents: "/some-documents",
        downloads: "/some-downloads",
        exe: "/some-exe",
        home: "/some-home-path",
        logs: "/some-logs",
        module: "/some-module",
        music: "/some-music",
        pictures: "/some-pictures",
        recent: "/some-recent",
        temp: "/some-temp",
        videos: "/some-videos",
        userData: "/some-app-data/some-product-name",
        sessionData: "/some-app-data/some-product-name",
      });
    });

    it("given in main, when injecting app paths, returns application specific app paths", () => {
      const actual = mainDi.inject(appPathsInjectable);

      expect(actual).toEqual({
        currentApp: "/some-current-app",
        appData: "/some-app-data",
        crashDumps: "/some-crash-dumps",
        desktop: "/some-desktop",
        documents: "/some-documents",
        downloads: "/some-downloads",
        exe: "/some-exe",
        home: "/some-home-path",
        logs: "/some-logs",
        module: "/some-module",
        music: "/some-music",
        pictures: "/some-pictures",
        recent: "/some-recent",
        temp: "/some-temp",
        videos: "/some-videos",
        userData: "/some-app-data/some-product-name",
        sessionData: "/some-app-data/some-product-name",
      });
    });
  });

  describe("when running integration tests", () => {
    let windowDi: DiContainer;

    beforeEach(async () => {
      builder.beforeApplicationStart(({ mainDi }) => {
        mainDi.override(directoryForIntegrationTestingInjectable, () => "/some-integration-testing-app-data");
      });

      await builder.render();

      windowDi = builder.applicationWindow.only.di;
    });

    it("given in renderer, when injecting path for app data, has integration specific app data path", () => {
      const { appData, userData } = windowDi.inject(appPathsInjectable);

      expect({ appData, userData }).toEqual({
        appData: "/some-integration-testing-app-data",
        userData: "/some-integration-testing-app-data/some-product-name",
      });
    });

    it("given in main, when injecting path for app data, has integration specific app data path", () => {
      const { appData, userData } = windowDi.inject(appPathsInjectable);

      expect({ appData, userData }).toEqual({
        appData: "/some-integration-testing-app-data",
        userData: "/some-integration-testing-app-data/some-product-name",
      });
    });
  });
});
