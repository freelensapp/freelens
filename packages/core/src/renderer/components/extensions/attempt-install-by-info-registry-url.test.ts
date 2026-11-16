/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import extensionInstallationStateStoreInjectable from "../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import downloadBinaryViaChannelInjectable from "../../fetch/download-binary-via-channel.injectable";
import downloadJsonViaChannelInjectable from "../../fetch/download-json-via-channel-copy.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import attemptInstallInjectable from "./attempt-install/attempt-install.injectable";
import attemptInstallByInfoInjectable from "./attempt-install-by-info.injectable";
import getBaseRegistryUrlInjectable from "./get-base-registry-url/get-base-registry-url.injectable";

import type { Mock } from "vitest";

import type { ExtensionInstallationStateStore } from "../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { AttemptInstallByInfo } from "./attempt-install-by-info.injectable";

const name = "@freelensapp/some-extension";

describe("attemptInstallByInfo, the URL of the registry", () => {
  let baseRegistryUrl: string;
  let attemptInstallByInfo: AttemptInstallByInfo;
  let installationStateStore: ExtensionInstallationStateStore;
  let downloadJsonMock: Mock;
  let downloadBinaryMock: Mock;
  let showErrorNotificationMock: Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    downloadJsonMock = vi.fn(async () => ({ callWasSuccessful: false, error: "404" }));
    downloadBinaryMock = vi.fn(async () => ({ callWasSuccessful: false, error: "404" }));
    showErrorNotificationMock = vi.fn();

    di.override(attemptInstallInjectable, () => vi.fn());
    di.override(getBaseRegistryUrlInjectable, () => async () => baseRegistryUrl);
    di.override(downloadJsonViaChannelInjectable, () => downloadJsonMock);
    di.override(downloadBinaryViaChannelInjectable, () => downloadBinaryMock);
    di.override(showErrorNotificationInjectable, () => showErrorNotificationMock);

    attemptInstallByInfo = di.inject(attemptInstallByInfoInjectable);
    installationStateStore = di.inject(extensionInstallationStateStoreInjectable);
  });

  it.each([[""], ["not a url"]])(
    "says that the custom registry %j is not valid, and asks it for nothing",
    async (registry) => {
      baseRegistryUrl = registry;

      await attemptInstallByInfo({ name });

      expect(showErrorNotificationMock).toHaveBeenCalledWith(
        'The URL of the custom extension registry is not valid. Set it in the App preferences, under "Extension Install Registry".',
      );
      expect(downloadJsonMock).not.toHaveBeenCalled();
    },
  );

  it.each([[""], ["not a url"]])(
    "leaves no installation in progress when the custom registry is %j",
    async (registry) => {
      baseRegistryUrl = registry;

      await attemptInstallByInfo({ name }).catch(() => undefined);

      expect(installationStateStore.anyPreInstallingOrInstalling).toBe(false);
    },
  );

  it("asks a registry with a valid URL for the metadata, and leaves no installation in progress when that fails", async () => {
    baseRegistryUrl = "https://npm.example.com/";

    await attemptInstallByInfo({ name });

    expect(downloadJsonMock).toHaveBeenCalledTimes(1);
    expect(installationStateStore.anyPreInstallingOrInstalling).toBe(false);
  });

  it("passes on what throws during the install, and leaves no installation in progress", async () => {
    baseRegistryUrl = "https://npm.example.com/";
    downloadJsonMock.mockImplementation(async () => ({
      callWasSuccessful: true,
      response: {
        versions: {
          "1.0.0": { name, version: "1.0.0", dist: { tarball: "https://npm.example.com/some-extension-1.0.0.tgz" } },
        },
      },
    }));
    downloadBinaryMock.mockImplementation(async () => {
      throw new Error("the channel is gone");
    });

    await expect(attemptInstallByInfo({ name })).rejects.toThrow("the channel is gone");

    expect(installationStateStore.anyPreInstallingOrInstalling).toBe(false);
  });
});
