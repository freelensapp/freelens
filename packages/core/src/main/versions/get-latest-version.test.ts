/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import proxyFetchInjectable from "../fetch/proxy-fetch.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import getLatestVersionInjectable from "./get-latest-version.injectable";

import type { ProxyFetch } from "../fetch/proxy-fetch.injectable";

const getLatestVersionWith = (proxyFetch: ProxyFetch) => {
  const di = getDiForUnitTesting();

  di.override(proxyFetchInjectable, () => proxyFetch);

  return di.inject(getLatestVersionInjectable);
};

describe("getLatestVersion", () => {
  it("returns the version of the package", async () => {
    const getLatestVersion = getLatestVersionWith(
      async () => ({ status: 200, json: async () => ({ version: "1.2.3" }) }) as Response,
    );

    expect(await getLatestVersion("@freelensapp/core")).toBe("1.2.3");
  });

  it("names the cause of a failed fetch", async () => {
    const getLatestVersion = getLatestVersionWith(async () => {
      throw new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED 127.0.0.1:1080") });
    });

    await expect(getLatestVersion("@freelensapp/core")).rejects.toThrow(
      "Failed to fetch latest version: fetch failed: connect ECONNREFUSED 127.0.0.1:1080",
    );
  });

  it("names the timeout of an aborted fetch", async () => {
    const getLatestVersion = getLatestVersionWith(async () => {
      throw "Operation timed out: timeout 5s";
    });

    await expect(getLatestVersion("@freelensapp/core")).rejects.toThrow(
      "Failed to fetch latest version: Operation timed out: timeout 5s",
    );
  });

  it("names the status of an unsuccessful response", async () => {
    const getLatestVersion = getLatestVersionWith(
      async () => ({ status: 503, statusText: "Service Unavailable" }) as Response,
    );

    await expect(getLatestVersion("@freelensapp/core")).rejects.toThrow(
      "Failed to fetch latest version: 503: Service Unavailable",
    );
  });
});
