/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import extensionApiVersionInjectable from "../../../../common/vars/extension-api-version.injectable";
import downloadJsonViaChannelInjectable from "../../../fetch/download-json-via-channel-copy.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import marketplaceDownloadErrorInjectable from "./marketplace-download-error.injectable";
import requestMarketplaceExtensionsInjectable from "./request-marketplace-extensions.injectable";

import type { DownloadJsonViaChannel } from "../../../fetch/download-json-via-channel-copy.injectable";

const setUp = (downloadJson: () => Promise<unknown>) => {
  const di = getDiForUnitTesting();

  di.permitSideEffects(requestMarketplaceExtensionsInjectable);
  di.override(downloadJsonViaChannelInjectable, () => downloadJson as DownloadJsonViaChannel);
  di.override(extensionApiVersionInjectable, () => "2.1.0");

  return {
    request: di.inject(requestMarketplaceExtensionsInjectable),
    downloadError: di.inject(marketplaceDownloadErrorInjectable),
  };
};

const requestWith = (downloadJson: () => Promise<unknown>) => setUp(downloadJson).request();

const list = {
  apiVersion: "freelens.app/v1",
  kind: "MarketplaceExtensionList",
  items: [
    {
      apiVersion: "freelens.app/v1",
      kind: "MarketplaceExtension",
      metadata: { name: "fluxcd" },
      spec: {
        displayName: "FluxCD",
        summary: "Integrates FluxCD support.",
        tier: "official",
        package: "@freelensapp/fluxcd-extension",
        versions: [{ version: "6.2.0", freelens: "^2.0.0" }],
      },
    },
  ],
};

describe("request-marketplace-extensions", () => {
  it("reads the entries of the list for the running Freelens", async () => {
    const extensions = await requestWith(async () => ({
      callWasSuccessful: true,
      response: {
        apiVersion: "freelens.app/v1",
        kind: "MarketplaceExtensionList",
        items: [
          {
            apiVersion: "freelens.app/v1",
            kind: "MarketplaceExtension",
            metadata: { name: "fluxcd" },
            spec: {
              displayName: "FluxCD",
              summary: "Integrates FluxCD support.",
              tier: "official",
              package: "@freelensapp/fluxcd-extension",
              versions: [{ version: "6.2.0", freelens: "^2.0.0" }],
            },
          },
        ],
      },
    }));

    expect(extensions).toEqual([
      expect.objectContaining({
        id: "fluxcd",
        packageName: "@freelensapp/fluxcd-extension",
        version: { version: "6.2.0", freelens: "^2.0.0" },
      }),
    ]);
  });

  it("has no entries when the list cannot be downloaded, and says why", async () => {
    const { request, downloadError } = setUp(async () => ({ callWasSuccessful: false, error: "offline" }));

    expect(await request()).toEqual([]);
    expect(downloadError.get()).toBe("offline");
  });

  it("keeps the list of the last download when a refresh fails, and forgets the error once one succeeds", async () => {
    const responses = [
      { callWasSuccessful: true, response: list },
      { callWasSuccessful: false, error: "offline" },
      { callWasSuccessful: true, response: list },
    ];
    const { request, downloadError } = setUp(async () => responses.shift());

    expect(await request()).toHaveLength(1);
    expect(downloadError.get()).toBeUndefined();

    expect(await request()).toHaveLength(1);
    expect(downloadError.get()).toBe("offline");

    await request();
    expect(downloadError.get()).toBeUndefined();
  });

  it("has no entries when the download is not a list of this version", async () => {
    const extensions = await requestWith(async () => ({
      callWasSuccessful: true,
      response: { meta: { version: 0 }, extensions: [] },
    }));

    expect(extensions).toEqual([]);
  });
});
