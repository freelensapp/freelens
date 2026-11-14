/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import proxyFetchInjectable from "../fetch/proxy-fetch.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import getLatestReleaseVersionInjectable from "./get-latest-release-version.injectable";

import type { ProxyFetch } from "../fetch/proxy-fetch.injectable";

const getLatestReleaseVersionWith = (proxyFetch: ProxyFetch) => {
  const di = getDiForUnitTesting();

  di.override(proxyFetchInjectable, () => proxyFetch);

  return di.inject(getLatestReleaseVersionInjectable);
};

const respond = (body: unknown) => async () => ({ status: 200, json: async () => body }) as Response;

describe("getLatestReleaseVersion", () => {
  it("asks the ProLens repository for its latest release", async () => {
    const proxyFetch = vi.fn(respond({ tag_name: "v2.1.0" }));

    expect(await getLatestReleaseVersionWith(proxyFetch)()).toBe("2.1.0");
    expect(proxyFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/chago1991/prolens/releases/latest",
      expect.anything(),
    );
  });

  it("accepts a tag without the v prefix and with a prerelease part", async () => {
    expect(await getLatestReleaseVersionWith(respond({ tag_name: "2.1.0-rc.1" }))()).toBe("2.1.0-rc.1");
  });

  it("rejects a tag that is not a version", async () => {
    await expect(getLatestReleaseVersionWith(respond({ tag_name: "nightly" }))()).rejects.toThrow(
      "Invalid response from GitHub releases",
    );
  });

  it("names the status when the repository has no release yet", async () => {
    const getLatestReleaseVersion = getLatestReleaseVersionWith(
      async () => ({ status: 404, statusText: "Not Found" }) as Response,
    );

    await expect(getLatestReleaseVersion()).rejects.toThrow("Failed to fetch latest release: 404: Not Found");
  });
});
