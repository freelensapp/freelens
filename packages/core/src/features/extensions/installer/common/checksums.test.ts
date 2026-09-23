/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import { computeTarballDigest, parseChecksumSidecar, verifySha256, verifySubresourceIntegrity } from "./checksums";

const data = Buffer.from("a tarball, for the purposes of this test");
const sha256 = createHash("sha256").update(data).digest("hex");
const sha512Base64 = createHash("sha512").update(data).digest("base64");

describe("computeTarballDigest", () => {
  it("is the sha256 of the archive bytes", () => {
    expect(computeTarballDigest(data)).toBe(sha256);
  });
});

describe("verifySubresourceIntegrity", () => {
  it("returns nothing when the data matches", () => {
    expect(verifySubresourceIntegrity(data, `sha512-${sha512Base64}`)).toBeUndefined();
  });

  it("returns the mismatch when the data does not match", () => {
    expect(verifySubresourceIntegrity(Buffer.from("something else"), `sha512-${sha512Base64}`)).toMatchObject({
      algorithm: "sha512",
      expected: sha512Base64,
    });
  });

  it("throws when the string carries no algorithm", () => {
    expect(() => verifySubresourceIntegrity(data, "sha512")).toThrow(/malformed/);
  });

  it("throws for an algorithm it cannot check, which is unverifiable rather than corrupt", () => {
    expect(() => verifySubresourceIntegrity(data, "sha3-abc")).toThrow(/unsupported/);
  });
});

describe("verifySha256", () => {
  it("accepts a digest in either case", () => {
    expect(verifySha256(data, sha256.toUpperCase())).toBeUndefined();
  });

  it("returns the mismatch when the data does not match", () => {
    expect(verifySha256(Buffer.from("something else"), sha256)).toMatchObject({
      algorithm: "sha256",
      expected: sha256,
    });
  });
});

describe("parseChecksumSidecar", () => {
  const tarball = "my-extension-0.1.0.tgz";
  const otherSha256 = "1".repeat(64);

  it("reads the sha256sum(1) output format", () => {
    expect(parseChecksumSidecar(`${sha256}  ${tarball}\n`, tarball)).toBe(sha256);
  });

  it("reads the binary-mode form of it", () => {
    expect(parseChecksumSidecar(`${sha256} *${tarball}\n`, tarball)).toBe(sha256);
  });

  it("reads a bare digest", () => {
    expect(parseChecksumSidecar(`${sha256}\n`, tarball)).toBe(sha256);
  });

  it("normalizes the case", () => {
    expect(parseChecksumSidecar(sha256.toUpperCase(), tarball)).toBe(sha256);
  });

  it("takes the digest of this file out of a combined listing, not the first one in it", () => {
    const contents = [
      `${otherSha256}  freelens-1.6.2.dmg`,
      `${otherSha256}  freelens-1.6.2.exe`,
      `${sha256}  ${tarball}`,
      "",
    ].join("\n");

    expect(parseChecksumSidecar(contents, tarball)).toBe(sha256);
  });

  it("ignores the directory a listing may have been written from", () => {
    expect(parseChecksumSidecar(`${sha256}  ./dist/${tarball}\n`, `/home/someone/src/${tarball}`)).toBe(sha256);
  });

  it("has nothing for a file a listing does not mention", () => {
    expect(parseChecksumSidecar(`${otherSha256}  some-other-extension-0.1.0.tgz\n`, tarball)).toBeUndefined();
  });

  it("falls back to a bare digest when no line names this file", () => {
    expect(parseChecksumSidecar(`${otherSha256}  some-other.tgz\n${sha256}\n`, tarball)).toBe(sha256);
  });

  it("treats a sidecar it cannot parse as a sidecar it does not have", () => {
    expect(parseChecksumSidecar("<html>404 Not Found</html>", tarball)).toBeUndefined();
    expect(parseChecksumSidecar("", tarball)).toBeUndefined();
  });
});
