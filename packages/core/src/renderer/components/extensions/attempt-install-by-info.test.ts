/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import downloadJsonViaChannelInjectable from "../../fetch/download-json-via-channel-copy.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import attemptInstallInjectable from "./attempt-install/attempt-install.injectable";
import attemptInstallByInfoInjectable from "./attempt-install-by-info.injectable";
import getBaseRegistryUrlInjectable from "./get-base-registry-url/get-base-registry-url.injectable";

import type { Mock } from "vitest";

describe("attemptInstallByInfo", () => {
  let baseRegistryUrl: string;
  let downloadJsonMock: Mock;

  beforeEach(() => {
    downloadJsonMock = vi.fn(async () => ({ callWasSuccessful: false, error: "404" }));
  });

  const requestedUrlFor = async (name: string) => {
    const di = getDiForUnitTesting();

    di.override(attemptInstallInjectable, () => vi.fn());
    di.override(getBaseRegistryUrlInjectable, () => async () => baseRegistryUrl);
    di.override(downloadJsonViaChannelInjectable, () => downloadJsonMock);
    di.override(showErrorNotificationInjectable, () => vi.fn());

    await di.inject(attemptInstallByInfoInjectable)({ name });

    return downloadJsonMock.mock.calls[0][0];
  };

  it.each([
    ["https://registry.npmjs.org", "some-extension", "https://registry.npmjs.org/some-extension"],
    [
      "https://registry.npmjs.org/",
      "@freelensapp/some-extension",
      "https://registry.npmjs.org/@freelensapp/some-extension",
    ],
    [
      "https://example.com/artifactory/api/npm/all-npm/",
      "some-extension",
      "https://example.com/artifactory/api/npm/all-npm/some-extension",
    ],
    [
      "https://example.com/artifactory/api/npm/all-npm",
      "some-extension",
      "https://example.com/artifactory/api/npm/all-npm/some-extension",
    ],
    [
      "https://example.com/artifactory/api/npm/all-npm/",
      "@freelensapp/some-extension",
      "https://example.com/artifactory/api/npm/all-npm/@freelensapp/some-extension",
    ],
  ])("requests the metadata from %s for %s at %s", async (base, name, expected) => {
    baseRegistryUrl = base;

    expect(await requestedUrlFor(name)).toBe(expected);
  });
});
