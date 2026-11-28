/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { parseMarketplaceExtensionList } from "./parse-marketplace-extension-list";

const listUrl = "https://raw.githubusercontent.com/freelensapp/freelens-marketplace/refs/heads/main/extensions.json";

const entry = (name: string, spec: Record<string, unknown> = {}) => ({
  apiVersion: "freelens.app/v1",
  kind: "MarketplaceExtension",
  metadata: { name },
  spec: {
    displayName: "My Extension",
    summary: "Does one thing.",
    tier: "community",
    package: "@jane-doe/my-extension",
    versions: [{ version: "1.0.0", freelens: "^2.0.0" }],
    ...spec,
  },
});

const list = (...items: unknown[]) => ({
  apiVersion: "freelens.app/v1",
  kind: "MarketplaceExtensionList",
  items,
});

const parse = (response: unknown, freelensVersion = "2.1.0") =>
  parseMarketplaceExtensionList(response, { freelensVersion, listUrl });

describe("parseMarketplaceExtensionList", () => {
  it("reads every field of an entry", () => {
    const [extension] = parse(
      list(
        entry("my-extension", {
          description: "Markdown for the details.",
          tier: "official",
          homepage: "https://example.com/my-extension",
          repository: "https://github.com/jane-doe/freelens-my-extension",
          license: "MIT",
          icon: "icon.png",
          authors: [{ name: "Jane Doe", email: "jane@example.com", url: "https://github.com/jane-doe" }],
        }),
      ),
    );

    expect(extension).toEqual({
      id: "my-extension",
      packageName: "@jane-doe/my-extension",
      displayName: "My Extension",
      summary: "Does one thing.",
      description: "Markdown for the details.",
      tier: "official",
      version: { version: "1.0.0", freelens: "^2.0.0" },
      homepage: "https://example.com/my-extension",
      repository: "https://github.com/jane-doe/freelens-my-extension",
      license: "MIT",
      iconUrl:
        "https://raw.githubusercontent.com/freelensapp/freelens-marketplace/refs/heads/main/extensions/my-extension/icon.png",
      authors: [{ name: "Jane Doe", email: "jane@example.com", url: "https://github.com/jane-doe" }],
    });
  });

  it("keeps the order of the list", () => {
    const names = parse(list(entry("b"), entry("a"), entry("c"))).map(({ id }) => id);

    expect(names).toEqual(["b", "a", "c"]);
  });

  it("offers the newest version whose range matches the running Freelens", () => {
    const versions = [
      { version: "7.0.0", freelens: "^3.0.0" },
      { version: "6.2.0", freelens: "^2.1.0" },
      { version: "6.0.0", freelens: "^2.0.0" },
    ];

    expect(parse(list(entry("a", { versions })), "2.1.0")[0].version.version).toBe("6.2.0");
    expect(parse(list(entry("a", { versions })), "2.0.3")[0].version.version).toBe("6.0.0");
    expect(parse(list(entry("a", { versions })), "3.0.0")[0].version.version).toBe("7.0.0");
  });

  it("leaves out an entry with no version for the running Freelens", () => {
    expect(parse(list(entry("a", { versions: [{ version: "7.0.0", freelens: "^3.0.0" }] })))).toEqual([]);
  });

  it("installs a version with url from the tarball, with its integrity", () => {
    const item = {
      version: "1.0.0",
      freelens: "^2.0.0",
      url: "https://github.com/jane-doe/freelens-my-extension/releases/download/v1.0.0/my-extension-1.0.0.tgz",
      integrity: "sha256-s6PpsK6kuWfyw0I43+NigYudCXL+jfsQjlgM5D5xVv4=",
    };

    expect(parse(list(entry("a", { versions: [item] })))[0].version).toEqual(item);
  });

  it("skips a version with url but no integrity, which would install unverified", () => {
    const versions = [
      { version: "1.1.0", freelens: "^2.0.0", url: "https://example.com/my-extension-1.1.0.tgz" },
      { version: "1.0.0", freelens: "^2.0.0" },
    ];

    expect(parse(list(entry("a", { versions })))[0].version).toEqual({ version: "1.0.0", freelens: "^2.0.0" });
  });

  it("skips a version whose url is not https", () => {
    const versions = [
      { version: "1.0.0", freelens: "^2.0.0", url: "http://example.com/my-extension-1.0.0.tgz", integrity: "sha256-a" },
    ];

    expect(parse(list(entry("a", { versions })))).toEqual([]);
  });

  it.each(["../icon.png", "sub/icon.png", "icon.svg", "..png"])("has no icon for the file name %s", (icon) => {
    expect(parse(list(entry("a", { icon })))[0].iconUrl).toBeUndefined();
  });

  it("drops links that are not https", () => {
    const [extension] = parse(
      list(
        entry("a", {
          homepage: "javascript:alert(1)",
          repository: "http://example.com",
          authors: [{ name: "Jane Doe", url: "file:///etc/passwd" }],
        }),
      ),
    );

    expect(extension.homepage).toBeUndefined();
    expect(extension.repository).toBeUndefined();
    expect(extension.authors).toEqual([{ name: "Jane Doe", email: undefined, url: undefined }]);
  });

  it.each([
    ["a wrong kind", { ...entry("a"), kind: "Theme" }],
    ["a name that is not a DNS label", entry("A_B")],
    ["no package", entry("a", { package: undefined })],
    ["an unknown tier", entry("a", { tier: "verified" })],
    ["no summary", entry("a", { summary: "" })],
  ])("leaves out an entry with %s", (_, item) => {
    expect(parse(list(item, entry("b"))).map(({ id }) => id)).toEqual(["b"]);
  });

  it("throws on anything but a list of freelens.app/v1", () => {
    expect(() => parse({ meta: { version: 0 }, extensions: [] })).toThrow(/MarketplaceExtensionList/);
    expect(() => parse({ ...list(), apiVersion: "freelens.app/v2" })).toThrow(/MarketplaceExtensionList/);
    expect(() => parse({ ...list(), items: undefined })).toThrow(/without items/);
  });
});
