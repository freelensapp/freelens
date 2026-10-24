/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import * as lockFile from "proper-lockfile";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kubectl } from "./kubectl";

import type { Logger } from "@freelensapp/logger";

import type { MockedFunction } from "vitest";

import type { DownloadProgress } from "../fetch/download-binary.injectable";
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
    // Set by `getPath` for the rest of the process once the bundle is found unusable.
    Kubectl.invalidBundle = false;
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

    it("forwards the download progress to the caller", async () => {
      const progress: DownloadProgress[] = [];

      dependencies.downloadBinary = async (_url, opts) => {
        opts?.onProgress?.({ transferred: 0, total: content.length });
        opts?.onProgress?.({ transferred: content.length, total: content.length });

        return { callWasSuccessful: true, response: downloaded };
      };

      await new Kubectl(dependencies, pinnedVersion).downloadKubectl({
        onDownloadProgress: (p) => progress.push(p),
      });

      expect(progress).toEqual([
        { transferred: 0, total: content.length },
        { transferred: content.length, total: content.length },
      ]);
    });

    it("reports the download phase with the version before the first progress", async () => {
      const events: string[] = [];

      dependencies.downloadBinary = async (_url, opts) => {
        opts?.onProgress?.({ transferred: 0, total: content.length });

        return { callWasSuccessful: true, response: downloaded };
      };

      await new Kubectl(dependencies, pinnedVersion).downloadKubectl({
        onDownloadProgress: ({ transferred }) => events.push(`progress: ${transferred}`),
        onPhase: (message) => events.push(`phase: ${message}`),
      });

      expect(events).toEqual([`phase: Downloading kubectl v${pinnedVersion} ...`, "progress: 0"]);
    });

    it("reports no download phase for a version it refuses to download", async () => {
      const phases: string[] = [];
      const kubectl = new Kubectl(dependencies, "1.21.14");

      await expect(kubectl.downloadKubectl({ onPhase: (message) => phases.push(message) })).rejects.toThrow(
        "No verified checksum is pinned",
      );
      expect(phases).toEqual([]);
    });

    it("gives the download a stall timeout", async () => {
      const downloadBinary = vi.fn(async () => ({ callWasSuccessful: true, response: downloaded }) as const);

      dependencies.downloadBinary = downloadBinary;

      await new Kubectl(dependencies, pinnedVersion).downloadKubectl();

      expect(downloadBinary).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ stallTimeout: expect.any(Number) }),
      );
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

    describe("reporting problems", () => {
      let problems: string[];

      beforeEach(() => {
        problems = [];
        // The real one rejects with ENOENT when a check unlinks a binary that
        // was never written, which would report a second, unrelated problem.
        dependencies.unlink = async (target) => void (await fs.unlink(target).catch(() => undefined));
      });

      const onProblem = (message: string) => problems.push(message);

      it("reports a version without a pinned checksum, and its consequence", async () => {
        await new Kubectl(dependencies, "1.21.14").ensureKubectl({ onProblem });

        expect(problems).toEqual([expect.stringContaining("No verified checksum is pinned for kubectl v1.21.14")]);
        expect(problems[0]).toContain(`using the bundled v${pinnedVersion}`);
      });

      it("reports a failed download exactly once", async () => {
        dependencies.downloadBinary = async () => ({ callWasSuccessful: false, error: "Not Found" });

        expect(await new Kubectl(dependencies, pinnedVersion).ensureKubectl({ onProblem })).toBe(false);

        expect(problems).toEqual([expect.stringContaining("Failed to download kubectl v9.9.9")]);
        expect(problems[0]).toContain("Not Found");
        expect(problems[0]).toContain(`using the bundled v${pinnedVersion}`);
      });

      it("reports a checksum mismatch exactly once", async () => {
        downloaded = Buffer.from("something else entirely");

        expect(await new Kubectl(dependencies, pinnedVersion).ensureKubectl({ onProblem })).toBe(false);

        expect(problems).toEqual([expect.stringContaining("Failed to download kubectl v9.9.9")]);
        expect(problems[0]).toContain("Checksum mismatch");
      });

      it("says nothing when everything works", async () => {
        dependencies.execFile = async () => ({
          callWasSuccessful: true,
          response: JSON.stringify({ clientVersion: { gitVersion: `v${pinnedVersion}` } }),
        });

        expect(await new Kubectl(dependencies, pinnedVersion).ensureKubectl({ onProblem })).toBe(true);

        expect(problems).toEqual([]);
      });
    });

    describe("when the same version is prepared more than once at a time", () => {
      let downloadBinary: MockedFunction<KubectlDependencies["downloadBinary"]>;
      let otherVersionBundled: KubectlDependencies;

      beforeEach(() => {
        downloadBinary = vi.fn(async () => ({ callWasSuccessful: true, response: downloaded }) as const);
        dependencies.execFile = async () => ({
          callWasSuccessful: true,
          response: JSON.stringify({ clientVersion: { gitVersion: `v${pinnedVersion}` } }),
        });
        otherVersionBundled = { ...dependencies, downloadBinary, bundledKubectlVersion: "9.9.8" };
      });

      it("downloads once, and every caller in the process gets the version-matched kubectl", async () => {
        const problems: string[] = [];
        const onProblem = (message: string) => problems.push(message);

        expect(
          await Promise.all([
            new Kubectl(otherVersionBundled, pinnedVersion).ensureKubectl({ onProblem }),
            new Kubectl(otherVersionBundled, pinnedVersion).ensureKubectl({ onProblem }),
          ]),
        ).toEqual([true, true]);
        expect(downloadBinary).toHaveBeenCalledTimes(1);
        expect(problems).toEqual([]);
      });

      it("reports a failed preparation to every caller waiting on it", async () => {
        const problems: string[] = [];

        downloadBinary.mockResolvedValue({ callWasSuccessful: false, error: "Not Found" });

        expect(
          await Promise.all([
            new Kubectl(otherVersionBundled, pinnedVersion).ensureKubectl({
              onProblem: (p) => problems.push(`a: ${p}`),
            }),
            new Kubectl(otherVersionBundled, pinnedVersion).ensureKubectl({
              onProblem: (p) => problems.push(`b: ${p}`),
            }),
          ]),
        ).toEqual([false, false]);
        expect(problems).toEqual([
          expect.stringMatching(/^a: Failed to download kubectl v9\.9\.9/),
          expect.stringMatching(/^b: Failed to download kubectl v9\.9\.9/),
        ]);
      });

      it("waits for another process that holds the lock, and uses what it prepared", async () => {
        const versionDirectory = path.join(directory, pinnedVersion);
        const phases: string[] = [];

        await fs.mkdir(versionDirectory, { recursive: true });

        const releaseOtherProcess = await lockFile.lock(versionDirectory);
        const result = new Kubectl(otherVersionBundled, pinnedVersion).ensureKubectl({
          onPhase: (message) => phases.push(message),
        });

        await vi.waitFor(() =>
          expect(phases).toEqual([`Waiting for another Freelens process to prepare kubectl v${pinnedVersion} ...`]),
        );

        // What the other process downloaded before it let go of the lock.
        await fs.writeFile(binaryPath(), content);
        await releaseOtherProcess();

        expect(await result).toBe(true);
        expect(downloadBinary).not.toHaveBeenCalled();
      });
    });

    /**
     * The first execution of a freshly downloaded binary blocks for seconds
     * while the OS validates it, so the phase is what stands between a
     * progress line frozen at 100% and something that reads as work.
     */
    describe("reporting the verification phase", () => {
      let events: string[];

      const onPhase = (message: string) => events.push(`phase: ${message}`);

      beforeEach(() => {
        events = [];
        dependencies.execFile = async () => {
          events.push("execFile");

          return {
            callWasSuccessful: true,
            response: JSON.stringify({ clientVersion: { gitVersion: `v${pinnedVersion}` } }),
          };
        };
      });

      it("reports the verification once, before the downloaded binary is executed", async () => {
        expect(await new Kubectl(dependencies, pinnedVersion).ensureKubectl({ onPhase })).toBe(true);

        expect(events).toEqual([
          `phase: Downloading kubectl v${pinnedVersion} ...`,
          `phase: Verifying kubectl v${pinnedVersion} ...`,
          "execFile",
        ]);
      });

      it("says nothing when nothing was downloaded", async () => {
        // A binary already in place, of a version the bundle does not provide:
        // the only check is the one the caller's "Checking kubectl ..." line
        // already covers.
        await fs.mkdir(path.join(directory, pinnedVersion), { recursive: true });
        await fs.writeFile(binaryPath(), content);

        const kubectl = new Kubectl({ ...dependencies, bundledKubectlVersion: "9.9.8" }, pinnedVersion);

        expect(await kubectl.ensureKubectl({ onPhase })).toBe(true);

        expect(events).toEqual(["execFile"]);
      });
    });
  });

  describe("getPath", () => {
    const bundledPath = () => path.join(directory, "bundled", "kubectl");

    it("returns the user's kubectl when downloading is turned off, without downloading", async () => {
      const downloadBinary = vi.fn(async () => ({ callWasSuccessful: true, response: downloaded }) as const);
      const kubectl = new Kubectl(
        {
          ...dependencies,
          downloadBinary,
          state: { ...dependencies.state, downloadKubectlBinaries: false, kubectlBinariesPath: "/some/kubectl" },
        },
        pinnedVersion,
      );

      expect(await kubectl.getPath()).toBe("/some/kubectl");
      expect(downloadBinary).not.toHaveBeenCalled();
    });

    it("reports an unusable bundle, and returns the bare binary name", async () => {
      const problems: string[] = [];

      expect(await new Kubectl(dependencies, pinnedVersion).getPath({ onProblem: (p) => problems.push(p) })).toBe(
        "kubectl",
      );
      expect(problems).toEqual([expect.stringContaining("using whichever kubectl is on PATH")]);
    });

    it("rejects on an unusable bundle when asked to, without claiming to go on with PATH", async () => {
      const problems: string[] = [];

      await expect(
        new Kubectl(dependencies, pinnedVersion).getPath(
          { onProblem: (p) => problems.push(p) },
          { whenBundleUnusable: "reject" },
        ),
      ).rejects.toThrow(
        `The bundled kubectl v${pinnedVersion} is not usable, so kubectl v${pinnedVersion} was not prepared ` +
          "and Freelens has no kubectl of its own to run",
      );
      expect(problems).toEqual([]);
    });

    describe("with a usable bundle of another version", () => {
      beforeEach(async () => {
        await fs.mkdir(path.dirname(bundledPath()), { recursive: true });
        await fs.writeFile(bundledPath(), "the bundled kubectl");
        dependencies.execFile = async () => ({
          callWasSuccessful: true,
          response: JSON.stringify({ clientVersion: { gitVersion: `v${pinnedVersion}` } }),
        });
      });

      it("downloads the version-matched kubectl, reporting the download, its progress and the verification", async () => {
        const events: string[] = [];

        dependencies.downloadBinary = async (_url, opts) => {
          opts?.onProgress?.({ transferred: content.length, total: content.length });

          return { callWasSuccessful: true, response: downloaded };
        };
        const kubectl = new Kubectl({ ...dependencies, bundledKubectlVersion: "9.9.8" }, pinnedVersion);

        expect(
          await kubectl.getPath({
            onDownloadProgress: ({ transferred }) => events.push(`progress: ${transferred}`),
            onPhase: (message) => events.push(`phase: ${message}`),
            onProblem: (message) => events.push(`problem: ${message}`),
          }),
        ).toBe(binaryPath());
        expect(events).toEqual([
          `phase: Downloading kubectl v${pinnedVersion} ...`,
          `progress: ${content.length}`,
          `phase: Verifying kubectl v${pinnedVersion} ...`,
        ]);
      });

      it("falls back to the bundled kubectl when the download fails, and says so", async () => {
        const problems: string[] = [];

        dependencies.downloadBinary = async () => ({ callWasSuccessful: false, error: "Not Found" });
        const kubectl = new Kubectl({ ...dependencies, bundledKubectlVersion: "9.9.8" }, pinnedVersion);

        expect(await kubectl.getPath({ onProblem: (p) => problems.push(p) })).toBe(bundledPath());
        expect(problems).toEqual([expect.stringContaining("Failed to download kubectl v9.9.9")]);
      });
    });
  });

  describe.skipIf(process.platform === "win32")("init scripts", () => {
    const isInstalled = (shell: string) => !spawnSync(shell, ["-c", "true"]).error;
    // The lines under test are the same in both scripts and run the same way
    // in bash, and the unit-test runners have no zsh.
    const zsh = isInstalled("zsh") ? "zsh" : "bash";
    const proxyCacheDirectory = "/some-proxy-kubeconfig-cache-directory";
    const profileCacheDirectory = "/some-profile-cache-directory";
    const kubectlDirectory = "/some-kubectl-directory";
    const bundledDirectory = "/some-bundled-directory";

    let home: string;

    const writeInitScripts = (pathPrefix: string[]) =>
      new Kubectl(dependencies, pinnedVersion).writeInitScripts({ pathPrefix, pathSuffix: [bundledDirectory] });

    beforeEach(async () => {
      home = path.join(directory, "home");
      await fs.mkdir(home);
      // Into a directory that does not exist yet, as it does not when
      // downloading kubectl is turned off.
      expect(await writeInitScripts([kubectlDirectory])).toBe(path.join(directory, pinnedVersion));
    });

    const shells = [
      {
        name: "bash",
        shell: "bash",
        args: ["--noprofile", "--norc", "-c"],
        initScript: ".bash_set_path",
        profile: ".bash_profile",
      },
      {
        name: "zsh",
        shell: zsh,
        args: zsh === "zsh" ? ["-f", "-c"] : ["--noprofile", "--norc", "-c"],
        initScript: ".zlogin",
        profile: ".zshrc",
      },
    ];

    describe.each(shells)("for $name", ({ shell, args, initScript, profile }) => {
      const run = async ({
        before,
        profileExports,
        profilePrepends,
        profileSets,
      }: {
        before?: string;
        profileExports?: string;
        profilePrepends?: string;
        profileSets?: string;
      }) => {
        const profileLines = [
          ...(profileExports === undefined ? [] : [`export KUBECACHEDIR="${profileExports}"`]),
          ...(profileSets === undefined ? [] : [`export PATH="${profileSets}"`]),
          ...(profilePrepends === undefined ? [] : [`export PATH="${profilePrepends}:$PATH"`]),
        ];

        if (profileLines.length > 0) {
          await fs.writeFile(path.join(home, profile), `${profileLines.join("\n")}\n`);
        }

        const script = path.join(directory, pinnedVersion, initScript);
        const { stdout } = await promisify(execFile)(
          shell,
          [
            ...args,
            `. "${script}"; printf '\\nresult:%s|%s|%s' "\${KUBECACHEDIR-<unset>}" "\${tempkubecachedir-<unset>}" "$PATH"`,
          ],
          {
            env: {
              // What the session's environment has: the tools around the
              // user's PATH.
              PATH: [kubectlDirectory, process.env.PATH, bundledDirectory].join(":"),
              HOME: home,
              OLD_ZDOTDIR: home,
              ...(before === undefined ? {} : { KUBECACHEDIR: before }),
            },
          },
        );
        const [kubeCacheDir, temporary, pathAfter] = stdout.split("\nresult:").at(-1)!.split("|");

        return { kubeCacheDir, temporary, path: pathAfter.split(":") };
      };

      it("puts the kubectl directory back in front of what the profile prepends to PATH", async () => {
        const result = await run({ profilePrepends: "/some-profile-directory" });

        expect(result.path.slice(0, 2)).toEqual([kubectlDirectory, "/some-profile-directory"]);
      });

      it("keeps the bundled binaries directory last, and each directory once", async () => {
        const result = await run({ profilePrepends: "/some-profile-directory" });

        expect(result.path.at(-1)).toBe(bundledDirectory);
        expect(result.path.filter((entry) => entry === kubectlDirectory)).toHaveLength(1);
        expect(result.path.filter((entry) => entry === bundledDirectory)).toHaveLength(1);
      });

      it("puts both back when the profile replaces PATH", async () => {
        const result = await run({ profileSets: "/usr/bin:/bin" });

        expect(result.path).toEqual([kubectlDirectory, "/usr/bin", "/bin", bundledDirectory]);
      });

      it("leaves no empty entry without a kubectl directory", async () => {
        await writeInitScripts([]);

        const result = await run({ profileSets: "/usr/bin:/bin" });

        expect(result.path).toEqual(["/usr/bin", "/bin", bundledDirectory]);
      });

      it("puts back the session's KUBECACHEDIR over the one the profile exports", async () => {
        const result = await run({ before: proxyCacheDirectory, profileExports: profileCacheDirectory });

        expect(result).toMatchObject({ kubeCacheDir: proxyCacheDirectory, temporary: "<unset>" });
      });

      it("keeps the profile's KUBECACHEDIR when the session started without one", async () => {
        const result = await run({ profileExports: profileCacheDirectory });

        expect(result).toMatchObject({ kubeCacheDir: profileCacheDirectory, temporary: "<unset>" });
      });

      it("leaves KUBECACHEDIR unset when neither the session nor the profile sets it", async () => {
        const result = await run({});

        expect(result).toMatchObject({ kubeCacheDir: "<unset>", temporary: "<unset>" });
      });
    });
  });
});
