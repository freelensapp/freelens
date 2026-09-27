/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { parseVersionDirectoryName, versionDirectoryName } from "./version-directory";

describe("version directory names", () => {
  it("shortens the digest to eight characters", () => {
    expect(versionDirectoryName("1.2.3", "0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0")).toBe(
      "1.2.3-0f1e2d3c",
    );
  });

  it("accepts a digest which is already short", () => {
    expect(versionDirectoryName("1.2.3", "0f1e2d3c")).toBe("1.2.3-0f1e2d3c");
  });

  it("round-trips a plain version", () => {
    expect(parseVersionDirectoryName(versionDirectoryName("1.2.3", "0f1e2d3c"))).toEqual({
      version: "1.2.3",
      digest: "0f1e2d3c",
    });
  });

  it("round-trips a prerelease version, which itself contains dashes", () => {
    expect(parseVersionDirectoryName(versionDirectoryName("2.0.0-beta.1", "abcdef01"))).toEqual({
      version: "2.0.0-beta.1",
      digest: "abcdef01",
    });
  });

  it("does not parse a directory without a digest segment, which marks a development extension", () => {
    expect(parseVersionDirectoryName("my-extension")).toBeUndefined();
    expect(parseVersionDirectoryName("1.2.3")).toBeUndefined();
  });

  it("does not parse a segment whose digest is not eight hex characters", () => {
    expect(parseVersionDirectoryName("1.2.3-0f1e2d3")).toBeUndefined();
    expect(parseVersionDirectoryName("1.2.3-0f1e2d3c4")).toBeUndefined();
    expect(parseVersionDirectoryName("1.2.3-notahexs")).toBeUndefined();
  });
});
