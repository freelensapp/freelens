/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable, showInfoNotificationInjectable } from "@freelensapp/notifications";
import { computed, observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import readJsonFileInjectable from "../../../../common/fs/read-json-file.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import activateInstalledBuildInjectable from "../../../../features/extensions/installer/common/activate-installed-build.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import confirmInjectable from "../../confirm-dialog/confirm.injectable";
import installFromDirectoryInjectable from "./install-from-directory.injectable";

import type { IObservableValue } from "mobx";
import type { Mock } from "vitest";

import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { InstallFromDirectory } from "./install-from-directory.injectable";

const extensionId = "@freelensapp/example-extension";
const directory = "/home/someone/src/example-extension";
const manifest = {
  name: extensionId,
  version: "2.0.0-3",
  renderer: "out/renderer.js",
  engines: { freelens: "^2.0.0" },
};

const managedInstall = (isEnabled: boolean): InstalledExtension => ({
  id: extensionId,
  absolutePath: "/some-directory-for-user-data/extensions/freelensapp--example-extension/2.0.0-2-0f1e2d3c",
  manifestPath: "/some-directory-for-user-data/extensions/freelensapp--example-extension/2.0.0-2-0f1e2d3c/package.json",
  manifest: { ...manifest, version: "2.0.0-2" },
  isCompatible: true,
  isManaged: true,
  isVerified: true,
  isEnabled,
});

const directoryInstall = (isEnabled: boolean): InstalledExtension => ({
  id: extensionId,
  absolutePath: directory,
  manifestPath: `${directory}/package.json`,
  manifest,
  isCompatible: true,
  isManaged: false,
  isVerified: false,
  isEnabled,
});

describe("installFromDirectory of an extension which is already installed", () => {
  let installFromDirectory: InstallFromDirectory;
  let installed: IObservableValue<InstalledExtension | undefined>;
  let confirmMock: Mock;
  let showInfoNotificationMock: Mock;
  let showErrorNotificationMock: Mock;
  let setIsEnabledMock: Mock;
  // What happened, in order, across the loader and the installer.
  let events: string[];
  let finishTearingDown: () => void;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    events = [];
    installed = observable.box<InstalledExtension | undefined>(undefined, { deep: false });
    confirmMock = vi.fn(async () => true);
    showInfoNotificationMock = vi.fn();
    showErrorNotificationMock = vi.fn();
    setIsEnabledMock = vi.fn(async (id: string, isEnabled: boolean) => {
      events.push(`set-is-enabled ${isEnabled}`);
    });

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(readJsonFileInjectable, () => async () => manifest);
    di.override(confirmInjectable, () => confirmMock);
    di.override(showInfoNotificationInjectable, () => showInfoNotificationMock);
    di.override(showErrorNotificationInjectable, () => showErrorNotificationMock);
    di.override(activateInstalledBuildInjectable, () => async () => {
      // What removes the directory of the managed build it replaces.
      events.push("activate");
      runInAction(() => installed.set(directoryInstall(false)));
    });
    di.override(
      extensionLoaderInjectable,
      () =>
        ({
          userExtensions: computed(() => {
            const extension = installed.get();

            return new Map(extension ? [[extension.id, extension]] : []);
          }),
          getExtensionById: () => installed.get(),
          setIsEnabled: setIsEnabledMock,
          whenTornDown: vi.fn(
            () =>
              new Promise<void>((resolve) => {
                events.push("waiting for the teardown");
                finishTearingDown = () => {
                  events.push("torn down");
                  resolve();
                };
              }),
          ),
        }) as unknown as ExtensionLoader,
    );

    installFromDirectory = di.inject(installFromDirectoryInjectable);
  });

  describe("when a managed install of it is enabled", () => {
    beforeEach(() => {
      installed.set(managedInstall(true));
    });

    it("asks to reinstall it from the directory rather than refusing", async () => {
      confirmMock.mockResolvedValue(false);

      await installFromDirectory(directory);

      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({ labelOk: "Reinstall", labelCancel: "Cancel" }),
      );
      expect(showErrorNotificationMock).not.toHaveBeenCalled();
      expect(events).toEqual([]);
    });

    it("disables it and replaces it only once it is torn down, then enables the directory", async () => {
      const installing = installFromDirectory(directory);

      await vi.waitFor(() => expect(events).toContain("waiting for the teardown"));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(events).toEqual(["set-is-enabled false", "waiting for the teardown"]);

      finishTearingDown();
      await installing;

      expect(events).toEqual([
        "set-is-enabled false",
        "waiting for the teardown",
        "torn down",
        "activate",
        "set-is-enabled true",
      ]);
      expect(showErrorNotificationMock).not.toHaveBeenCalled();
    });
  });

  describe("when it is enabled and loaded from the same directory", () => {
    beforeEach(() => {
      installed.set(directoryInstall(true));
    });

    it("says so and changes nothing", async () => {
      await installFromDirectory(directory);

      expect(confirmMock).not.toHaveBeenCalled();
      expect(events).toEqual([]);
      expect(showInfoNotificationMock).toHaveBeenCalledTimes(1);
      expect(showErrorNotificationMock).not.toHaveBeenCalled();
    });
  });

  describe("when a managed install of it is disabled", () => {
    beforeEach(() => {
      installed.set(managedInstall(false));
    });

    it("asks to install from the directory, and replaces it once any teardown is over", async () => {
      const installing = installFromDirectory(directory);

      await vi.waitFor(() => expect(events).toContain("waiting for the teardown"));

      finishTearingDown();
      await installing;

      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ labelOk: "Install" }));
      expect(events).toEqual(["waiting for the teardown", "torn down", "activate", "set-is-enabled true"]);
    });
  });
});
