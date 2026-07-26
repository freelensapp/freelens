/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Kubectl } from "./kubectl";

import type { Logger } from "@freelensapp/logger";

import type { KubectlDependencies } from "./kubectl";

// Fictitious on purpose: getKubectlChecksum below is a mock matching only this
// constant, not the real pin table, so nothing here tracks the actual bundled
// or latest kubectl version.
const pinnedVersion = "9.9.9";
const content = Buffer.from("a kubectl binary");
const contentDigest = createHash("sha256").update(content).digest("hex");

describe("kubectl", () => {
  let directory: string;
  let dependencies: KubectlDependencies;
  let downloaded: Buffer;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "freelens-kubectl-"));
    downloaded = content;

    dependencies = {
      directoryForKubectlBinaries: directory,
      normalizedDownloadPlatform: "linux",
      normalizedDownloadArch: "amd64",
      kubectlBinaryName: "kubectl",
      bundledKubectlBinaryPath: path.join(directory, "bundled", "kubectl"),
      baseBundledBinariesDirectory: path.join(directory, "bundled"),
      state: {
        downloadKubectlBinaries: true,
        downloadMirror: "default",
      },
      bundledKubectlVersion: pinnedVersion,
      kubectlVersionMap: new Map([["9.9", pinnedVersion]]),
      getKubectlChecksum: ({ version, platform, arch }) =>
        version === pinnedVersion && platform === "linux" && arch === "amd64"
          ? { url: `https://dl.k8s.io/release/v${pinnedVersion}/bin/linux/amd64/kubectl`, sha256: contentDigest }
          : undefined,
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        silly: () => {},
      } as unknown as Logger,
      downloadBinary: async () => ({ callWasSuccessful: true, response: downloaded }),
      joinPaths: path.join,
      getDirnameOfPath: path.dirname,
      getBasenameOfPath: path.basename,
      execFile: async () => ({ callWasSuccessful: true, response: "" }),
      unlink: fs.unlink,
    };
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  const binaryPath = () => path.join(directory, pinnedVersion, "kubectl");

  const leftoverDownloads = async () =>
    (await fs.readdir(path.join(directory, pinnedVersion))).filter((entry) => entry.includes(".download-"));

  describe("downloadKubectl", () => {
    it("puts the binary in place when the digest matches the pin", async () => {
      await new Kubectl(dependencies, pinnedVersion).downloadKubectl();

      expect(await fs.readFile(binaryPath())).toEqual(content);
      expect(await leftoverDownloads()).toEqual([]);
    });

    it("makes the binary executable", async () => {
      await new Kubectl(dependencies, pinnedVersion).downloadKubectl();

      expect((await fs.stat(binaryPath())).mode & 0o777).toBe(0o755);
    });

    it("rejects content that does not match the pin, leaving nothing behind", async () => {
      downloaded = Buffer.from("something else entirely");

      const kubectl = new Kubectl(dependencies, pinnedVersion);

      await expect(kubectl.downloadKubectl()).rejects.toThrow("Checksum mismatch");

      await expect(fs.access(binaryPath())).rejects.toThrow();
      expect(await leftoverDownloads()).toEqual([]);
    });

    it("does not touch an existing binary when the download does not match", async () => {
      await fs.mkdir(path.join(directory, pinnedVersion), { recursive: true });
      await fs.writeFile(binaryPath(), "the previous kubectl");
      downloaded = Buffer.from("something else entirely");

      const kubectl = new Kubectl(dependencies, pinnedVersion);

      await expect(kubectl.downloadKubectl()).rejects.toThrow("Checksum mismatch");

      expect(await fs.readFile(binaryPath(), "utf-8")).toBe("the previous kubectl");
    });

    it("refuses to download a version that is not pinned", async () => {
      const kubectl = new Kubectl(dependencies, "1.21.14");

      await expect(kubectl.downloadKubectl()).rejects.toThrow("No verified checksum is pinned");
    });
  });

  describe("ensureKubectl", () => {
    it("refuses a version that is not pinned", async () => {
      expect(await new Kubectl(dependencies, "1.21.14").ensureKubectl()).toBe(false);
    });

    it("refuses an architecture that has no pin for an otherwise pinned version", async () => {
      const kubectl = new Kubectl({ ...dependencies, normalizedDownloadArch: "arm64" }, pinnedVersion);

      expect(await kubectl.ensureKubectl()).toBe(false);
    });

    it("still creates the version directory when it refuses, so the shell session scripts have a home", async () => {
      await new Kubectl(dependencies, "1.21.14").ensureKubectl();

      expect((await fs.stat(path.join(directory, "1.21.14"))).isDirectory()).toBe(true);
    });
  });
});
