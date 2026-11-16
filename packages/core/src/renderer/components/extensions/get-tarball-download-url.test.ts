/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { getTarballDownloadUrl } from "./get-tarball-download-url";

const tarball = "https://registry.npmjs.org/@freelensapp/some-extension/-/some-extension-1.2.3.tgz";

describe("getTarballDownloadUrl", () => {
  it.each([["https://registry.npmjs.org"], ["https://registry.npmjs.org/"]])(
    "leaves the tarball of the default registry as it is when the registry is %s",
    (registry) => {
      expect(getTarballDownloadUrl(tarball, registry)).toBe(tarball);
    },
  );

  it.each([
    ["https://npm.example.com", "https://npm.example.com/@freelensapp/some-extension/-/some-extension-1.2.3.tgz"],
    ["https://npm.example.com/", "https://npm.example.com/@freelensapp/some-extension/-/some-extension-1.2.3.tgz"],
    ["http://127.0.0.1:4873/", "http://127.0.0.1:4873/@freelensapp/some-extension/-/some-extension-1.2.3.tgz"],
    [
      "https://example.com/artifactory/api/npm/all-npm/",
      "https://example.com/artifactory/api/npm/all-npm/@freelensapp/some-extension/-/some-extension-1.2.3.tgz",
    ],
    [
      "https://example.com/artifactory/api/npm/all-npm",
      "https://example.com/artifactory/api/npm/all-npm/@freelensapp/some-extension/-/some-extension-1.2.3.tgz",
    ],
  ])("requests the tarball of the default registry from the registry %s", (registry, expected) => {
    expect(getTarballDownloadUrl(tarball, registry)).toBe(expected);
  });

  it("requests the tarball of a package without a scope from the configured registry", () => {
    expect(
      getTarballDownloadUrl(
        "https://registry.npmjs.org/some-extension/-/some-extension-1.2.3.tgz",
        "https://example.com/artifactory/api/npm/all-npm/",
      ),
    ).toBe("https://example.com/artifactory/api/npm/all-npm/some-extension/-/some-extension-1.2.3.tgz");
  });

  it("requests a tarball that the default registry lists over http from the configured registry", () => {
    expect(
      getTarballDownloadUrl(
        "http://registry.npmjs.org/some-extension/-/some-extension-1.2.3.tgz",
        "https://npm.example.com/",
      ),
    ).toBe("https://npm.example.com/some-extension/-/some-extension-1.2.3.tgz");
  });

  it("leaves a tarball that is already on the configured registry as it is", () => {
    const own =
      "https://example.com/artifactory/api/npm/all-npm/@freelensapp/some-extension/-/some-extension-1.2.3.tgz";

    expect(getTarballDownloadUrl(own, "https://example.com/artifactory/api/npm/all-npm/")).toBe(own);
  });

  it("leaves a tarball on a host that is neither registry as it is", () => {
    const elsewhere = "https://downloads.example.org/some-extension-1.2.3.tgz";

    expect(getTarballDownloadUrl(elsewhere, "https://npm.example.com/")).toBe(elsewhere);
  });

  it.each([["registry.npmjs.com"], ["registry.yarnpkg.com"], ["registry.npmmirror.com"], ["registry.npm.taobao.org"]])(
    "requests the tarball that the public registry %s lists from the configured registry",
    (host) => {
      expect(
        getTarballDownloadUrl(
          `https://${host}/@freelensapp/some-extension/-/some-extension-1.2.3.tgz`,
          "https://example.com/artifactory/api/npm/all-npm/",
        ),
      ).toBe("https://example.com/artifactory/api/npm/all-npm/@freelensapp/some-extension/-/some-extension-1.2.3.tgz");
    },
  );

  it.each([["https://registry.yarnpkg.com/"], ["https://registry.npmmirror.com"]])(
    "leaves the tarball of a public registry as it is when the registry is the public %s",
    (registry) => {
      expect(getTarballDownloadUrl(tarball, registry)).toBe(tarball);
    },
  );

  it("keeps the query of the registry and of the tarball, and the fragment of the tarball", () => {
    expect(getTarballDownloadUrl(`${tarball}?cache=1#sha`, "https://npm.example.com/npm/?repo=all#ignored")).toBe(
      "https://npm.example.com/npm/@freelensapp/some-extension/-/some-extension-1.2.3.tgz?repo=all&cache=1#sha",
    );
  });

  it("leaves a tarball that is not a URL as it is", () => {
    expect(getTarballDownloadUrl("some-extension-1.2.3.tgz", "https://npm.example.com/")).toBe(
      "some-extension-1.2.3.tgz",
    );
  });
});
