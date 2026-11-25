/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { hasTypedProperty, isObject, isString, json } from "@freelensapp/utilities";
import { noop } from "es-toolkit";
import { ensureDir, pathExists } from "fs-extra";
import * as lockFile from "proper-lockfile";
import * as verkit from "verkit";
import {
  customPackageMirror,
  defaultPackageMirror,
  packageMirrors,
} from "../../features/user-preferences/common/preferences-helpers";

import type { Logger } from "@freelensapp/logger";

import type { ExecFile, ExecFileError } from "../../common/fs/exec-file.injectable";
import type { Unlink } from "../../common/fs/unlink.injectable";
import type { GetBasenameOfPath } from "../../common/path/get-basename.injectable";
import type { GetDirnameOfPath } from "../../common/path/get-dirname.injectable";
import type { JoinPaths } from "../../common/path/join-paths.injectable";
import type { NormalizedPlatform } from "../../common/vars/normalized-platform.injectable";
import type { DownloadBinary, DownloadProgress } from "../fetch/download-binary.injectable";
import type { GetKubectlChecksum } from "./kubectl-checksums.injectable";

const initScriptVersionString = "# freelens-initscript v4";

/**
 * The init scripts source the user's profile files, which may export a
 * `KUBECACHEDIR` of their own. A cluster session sets one for its proxy
 * kubeconfig, so it is put back afterwards, like `KUBECONFIG`. A session that
 * started without one keeps whatever the profile sets rather than getting an
 * empty value.
 */
const saveKubeCacheDirectory = [
  'if test -n "${KUBECACHEDIR+set}"; then',
  '  tempkubecachedir="$KUBECACHEDIR"',
  "else",
  "  unset tempkubecachedir",
  "fi",
];
const restoreKubeCacheDirectory = [
  'if test -n "${tempkubecachedir+set}"; then',
  '  export KUBECACHEDIR="$tempkubecachedir"',
  "fi",
];

/**
 * How long the download may go without receiving a single byte before it is
 * given up on. A fixed overall deadline would kill a legitimate ~50 MB
 * download over a slow link, while an unresponsive host would otherwise hang
 * forever behind a progress indicator that never moves.
 */
const downloadStallTimeout = 30_000;

/**
 * Reporting hooks for a caller that shows what is happening, e.g. a terminal
 * that is waiting for kubectl before it can spawn a shell. Every problem is
 * reported with its consequence, because the caller continues either way.
 */
export interface KubectlProgressOptions {
  onDownloadProgress?: (progress: DownloadProgress) => void;
  onProblem?: (message: string) => void;
  /** A startup phase that is about to begin and may take a while. */
  onPhase?: (message: string) => void;
}

/**
 * Error codes that indicate the binary could not be executed because of a
 * transient condition rather than because the binary itself is broken. On
 * Windows a freshly downloaded executable is frequently locked for a short
 * time by antivirus real-time scanning (surfacing as `EBUSY`), and similar
 * races can produce `ETXTBSY`/`EAGAIN`/`EPERM`. In these cases the binary is
 * almost certainly valid and must not be deleted.
 */
const transientExecErrorCodes = new Set(["EBUSY", "ETXTBSY", "EAGAIN", "EPERM", "EACCES"]);

function isTransientExecError(error: ExecFileError | undefined): boolean {
  return typeof error?.code === "string" && transientExecErrorCodes.has(error.code);
}

/**
 * Error codes a rename onto the destination may fail with on Windows while the
 * verified content is perfectly fine: antivirus real-time scanning routinely
 * holds a freshly created executable open for a moment. Retrying is safe
 * precisely because the bytes have already been checked against the pin.
 */
const transientRenameErrorCodes = new Set(["EPERM", "EBUSY", "EACCES"]);

const renameAttempts = 5;
const renameRetryDelay = 100;

/**
 * How another Freelens process preparing the same kubectl version is waited
 * for. Its lock is refreshed while it works and goes stale ten seconds after
 * it dies, so the wait ends when the other process finishes or dies; the
 * bound, about ten minutes, only covers one that hangs.
 */
const lockRetries = { retries: 300, factor: 1.5, minTimeout: 200, maxTimeout: 2000 };

/**
 * The reporting hooks of every caller waiting on one preparation of a kubectl
 * version. A caller that joins late is told the phase in progress and the
 * problems reported before it joined.
 */
class ProgressListeners implements KubectlProgressOptions {
  protected readonly listeners = new Set<KubectlProgressOptions>();
  protected readonly problems: string[] = [];
  protected phase?: string;

  add(listener: KubectlProgressOptions | undefined): () => void {
    if (listener === undefined) {
      return noop;
    }

    if (this.phase !== undefined) {
      listener.onPhase?.(this.phase);
    }

    this.problems.forEach((problem) => listener.onProblem?.(problem));
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  onDownloadProgress = (progress: DownloadProgress) => {
    this.listeners.forEach((listener) => listener.onDownloadProgress?.(progress));
  };

  onPhase = (message: string) => {
    this.phase = message;
    this.listeners.forEach((listener) => listener.onPhase?.(message));
  };

  onProblem = (message: string) => {
    this.problems.push(message);
    this.listeners.forEach((listener) => listener.onProblem?.(message));
  };
}

interface Preparation {
  readonly listeners: ProgressListeners;
  readonly result: Promise<boolean>;
}

export interface KubectlDependencies {
  readonly directoryForKubectlBinaries: string;
  readonly normalizedDownloadPlatform: NormalizedPlatform;
  readonly normalizedDownloadArch: "amd64" | "arm64" | "386";
  readonly kubectlBinaryName: string;
  readonly bundledKubectlBinaryPath: string;
  readonly state: {
    readonly kubectlBinariesPath?: string;
    readonly downloadBinariesPath?: string;
    readonly downloadKubectlBinaries: boolean;
    readonly downloadMirror: string;
    readonly downloadCustomMirror?: string;
  };
  readonly bundledKubectlVersion: string;
  readonly kubectlVersionMap: Map<string, string>;
  readonly getKubectlChecksum: GetKubectlChecksum;
  readonly logger: Logger;
  downloadBinary: DownloadBinary;
  joinPaths: JoinPaths;
  getDirnameOfPath: GetDirnameOfPath;
  getBasenameOfPath: GetBasenameOfPath;
  execFile: ExecFile;
  unlink: Unlink;
}

export class Kubectl {
  public readonly kubectlVersion: string;
  protected readonly url: string;
  protected readonly path: string;
  protected readonly dirname: string;

  public static invalidBundle = false;

  /**
   * The preparations in progress in this process, by the directory of the
   * version they prepare, so that a second caller, such as an extension while
   * a terminal downloads, waits for the same kubectl instead of failing to
   * get the lock the first one holds.
   */
  protected static readonly preparations = new Map<string, Preparation>();

  constructor(
    protected readonly dependencies: KubectlDependencies,
    clusterVersion: string,
  ) {
    let version: verkit.SemVer;
    const bundledVersion = verkit.parse(this.dependencies.bundledKubectlVersion);

    try {
      version = verkit.parse(clusterVersion);
    } catch {
      version = bundledVersion;
    }

    const fromMajorMinor = this.dependencies.kubectlVersionMap.get(`${version.major}.${version.minor}`);

    /**
     * minorVersion is the first two digits of kube server version if the version map includes that,
     * use that version, if not, fallback to the exact x.y.z of kube version
     */
    if (fromMajorMinor) {
      this.kubectlVersion = fromMajorMinor;
      this.dependencies.logger.debug(
        `Set kubectl version ${this.kubectlVersion} for cluster version ${clusterVersion} using version map`,
      );
    } else {
      /* this is the version (without possible prelease tag) to get from the download mirror */
      this.kubectlVersion = `${version.major}.${version.minor}.${version.patch}`;
      this.dependencies.logger.debug(
        `Set kubectl version ${this.kubectlVersion} for cluster version ${clusterVersion} using fallback`,
      );
    }

    this.url = `${this.getDownloadMirror()}/v${this.kubectlVersion}/bin/${this.dependencies.normalizedDownloadPlatform}/${this.dependencies.normalizedDownloadArch}/${this.dependencies.kubectlBinaryName}`;
    this.dirname = this.dependencies.joinPaths(this.getDownloadDir(), this.kubectlVersion);
    this.path = this.dependencies.joinPaths(this.dirname, this.dependencies.kubectlBinaryName);
  }

  public getBundledPath() {
    return this.dependencies.bundledKubectlBinaryPath;
  }

  /**
   * Where the kubectl matched to this cluster version is put in the download
   * directory, whether or not it is there yet.
   */
  public getVersionMatchedPath() {
    return this.path;
  }

  /**
   * The verified digest this download must match, or `undefined` when there is
   * none for this version on this platform and architecture.
   */
  protected getPinnedChecksum() {
    return this.dependencies.getKubectlChecksum({
      version: this.kubectlVersion,
      platform: this.dependencies.normalizedDownloadPlatform,
      arch: this.dependencies.normalizedDownloadArch,
    });
  }

  public getPathFromPreferences() {
    return this.dependencies.state.kubectlBinariesPath || this.getBundledPath();
  }

  protected getDownloadDir() {
    if (this.dependencies.state.downloadBinariesPath) {
      return this.dependencies.joinPaths(this.dependencies.state.downloadBinariesPath, "kubectl");
    }

    return this.dependencies.directoryForKubectlBinaries;
  }

  /**
   * The kubectl to run for this cluster version: the user's own one when
   * downloading is turned off, otherwise the version-matched one, downloaded
   * when it is missing, and the bundled one when that fails.
   *
   * @param whenBundleUnusable what to do when the bundled kubectl is not
   * usable, so that no kubectl is prepared: `"use-path"` returns the bare
   * binary name, for a caller that leaves the lookup to `PATH`, and `"reject"`
   * rejects, for a caller that must return a kubectl of Freelens' own
   * @returns an absolute path, or the bare binary name as above
   */
  public getPath = async (
    opts?: KubectlProgressOptions,
    { whenBundleUnusable = "use-path" }: { whenBundleUnusable?: "use-path" | "reject" } = {},
  ): Promise<string> => {
    if (this.dependencies.state.downloadKubectlBinaries === false) {
      return this.getPathFromPreferences();
    }

    // Checked on every call, so that a bundle that works again is used again.
    Kubectl.invalidBundle = !(await this.checkBinary(this.getBundledPath(), false));

    if (Kubectl.invalidBundle) {
      const problem =
        `The bundled kubectl v${this.dependencies.bundledKubectlVersion} is not usable, so kubectl ` +
        `v${this.kubectlVersion} was not prepared`;

      if (whenBundleUnusable === "reject") {
        // The rejection is the report: the caller does not go on.
        throw new Error(`${problem} and Freelens has no kubectl of its own to run`);
      }

      opts?.onProblem?.(`${problem} - using whichever kubectl is on PATH`);

      return this.dependencies.getBasenameOfPath(this.getBundledPath());
    }

    try {
      if (!(await this.ensureKubectl(opts))) {
        this.dependencies.logger.error(
          `Failed to ensure kubectl ${this.kubectlVersion}, fallback to the bundled version`,
        );

        return this.getBundledPath();
      }

      return this.path;
    } catch (err) {
      this.dependencies.logger.error(
        `Failed to ensure kubectl ${this.kubectlVersion}, fallback to the bundled version`,
        err,
      );
      opts?.onProblem?.(
        `Failed to prepare kubectl v${this.kubectlVersion} (${this.reasonOf(err)}) - ` +
          `using the bundled v${this.dependencies.bundledKubectlVersion}`,
      );

      return this.getBundledPath();
    }
  };

  /** The human-readable half of an error, without the `Error: ` prefix. */
  protected reasonOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  public async checkBinary(path: string, checkVersion = true) {
    const exists = await pathExists(path);

    if (!exists) {
      return false;
    }

    const args = ["version", "--client", "--output", "json"];
    const execResult = await this.dependencies.execFile(path, args);

    if (!execResult.callWasSuccessful) {
      // A transient failure (e.g. the binary is momentarily locked by
      // antivirus right after being downloaded on Windows, surfacing as
      // EBUSY) does not mean the binary is broken. Keep it instead of
      // deleting a perfectly good download; it will verify on a later run.
      if (isTransientExecError(execResult.error)) {
        this.dependencies.logger.warn(
          `Local kubectl could not be verified because of a transient error (${execResult.error.code}), keeping the binary`,
        );

        return true;
      }

      this.dependencies.logger.error(`Local kubectl failed to run properly (${execResult.error}), unlinking`);
      await this.dependencies.unlink(path);

      return;
    }

    const parseResult = json.parse(execResult.response);

    if (!parseResult.callWasSuccessful) {
      this.dependencies.logger.error(`Local kubectl failed to run properly (${parseResult.error}), unlinking`);
      await this.dependencies.unlink(path);

      return;
    }

    if (!checkVersion) {
      return true;
    }

    const { response: output } = parseResult;

    if (
      !isObject(output) ||
      !hasTypedProperty(output, "clientVersion", isObject) ||
      !hasTypedProperty(output.clientVersion, "gitVersion", isString)
    ) {
      this.dependencies.logger.error(`Local kubectl failed to return correct shaped response, unlinking`);
      await this.dependencies.unlink(path);

      return;
    }

    const version = output.clientVersion.gitVersion;

    switch (output.clientVersion.gitVersion) {
      case this.kubectlVersion:
      case `v${this.kubectlVersion}`:
        this.dependencies.logger.debug(`Local kubectl is version ${this.kubectlVersion}`);

        return true;
      default:
        this.dependencies.logger.error(
          `Local kubectl is version ${version}, expected ${this.kubectlVersion}, unlinking`,
        );
        await this.dependencies.unlink(path);

        return false;
    }
  }

  protected async checkBundled(): Promise<boolean> {
    if (this.kubectlVersion === this.dependencies.bundledKubectlVersion) {
      try {
        const exist = await pathExists(this.path);

        if (!exist) {
          await fs.promises.copyFile(this.getBundledPath(), this.path);
          await fs.promises.chmod(this.path, 0o755);
        }

        return true;
      } catch (err) {
        this.dependencies.logger.error(`Could not copy the bundled kubectl to app-data: ${err}`);

        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Makes the kubectl of this version ready to run. Callers in this process
   * share one preparation per version, and another Freelens process preparing
   * the same version is waited for, so every caller gets the outcome of the
   * one preparation rather than a fallback because someone else holds it.
   *
   * @returns whether the version-matched kubectl is ready; when it is not, the
   * reason has been reported through `opts.onProblem`
   */
  public async ensureKubectl(opts?: KubectlProgressOptions): Promise<boolean> {
    if (this.dependencies.state.downloadKubectlBinaries === false) {
      return true;
    }

    let preparation = Kubectl.preparations.get(this.dirname);

    if (preparation === undefined) {
      const listeners = new ProgressListeners();
      const result = this.prepareKubectl(listeners).finally(() => Kubectl.preparations.delete(this.dirname));

      preparation = { listeners, result };
      Kubectl.preparations.set(this.dirname, preparation);
    }

    const removeListener = preparation.listeners.add(opts);

    try {
      return await preparation.result;
    } finally {
      removeListener();
    }
  }

  /**
   * Takes the lock on the version directory, waiting for another process that
   * holds it, and says so, because that wait can be as long as a download.
   */
  protected async lockVersionDirectory(opts: KubectlProgressOptions): Promise<() => Promise<void>> {
    try {
      return await lockFile.lock(this.dirname);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ELOCKED") {
        throw error;
      }
    }

    this.dependencies.logger.info(`[KUBECTL]: waiting for another process to prepare kubectl ${this.kubectlVersion}`);
    opts.onPhase?.(`Waiting for another Freelens process to prepare kubectl v${this.kubectlVersion} ...`);

    return lockFile.lock(this.dirname, { retries: lockRetries });
  }

  protected async prepareKubectl(opts: KubectlProgressOptions): Promise<boolean> {
    // Set by `getPath`, which reports what it does about an unusable bundle
    // itself; what any other caller does next is that caller's to say.
    if (Kubectl.invalidBundle) {
      this.dependencies.logger.error(`Detected invalid bundle binary, returning ...`);
      opts.onProblem?.(
        `The bundled kubectl v${this.dependencies.bundledKubectlVersion} was found not usable, so kubectl ` +
          `v${this.kubectlVersion} was not prepared`,
      );

      return false;
    }

    // The lock below is taken on this directory, which a cluster shell also
    // reads its init scripts from (`writeInitScripts`).
    await ensureDir(this.dirname, 0o755);

    // Nothing may be downloaded without a digest to check it against. One
    // condition covers both reasons there may be none: a version outside the
    // pinned range, and a platform/architecture upstream never published for
    // that version.
    if (!this.getPinnedChecksum()) {
      this.dependencies.logger.error(
        `No verified checksum is pinned for kubectl ${this.kubectlVersion} on ` +
          `${this.dependencies.normalizedDownloadPlatform}/${this.dependencies.normalizedDownloadArch}, ` +
          `so it will not be downloaded. The bundled kubectl ${this.dependencies.bundledKubectlVersion} is used ` +
          `instead; set the "Path to kubectl binary" preference (kubectlBinariesPath) to use a different one.`,
      );
      opts.onProblem?.(
        `No verified checksum is pinned for kubectl v${this.kubectlVersion} on ` +
          `${this.dependencies.normalizedDownloadPlatform}/${this.dependencies.normalizedDownloadArch}, so it was ` +
          `not downloaded - using the bundled v${this.dependencies.bundledKubectlVersion}`,
      );

      return false;
    }

    let release: () => Promise<void>;

    try {
      release = await this.lockVersionDirectory(opts);
    } catch (error) {
      this.dependencies.logger.error(`[KUBECTL]: Failed to get a lock for ${this.kubectlVersion}`, error);
      opts.onProblem?.(
        `Failed to get a lock for kubectl v${this.kubectlVersion} (${this.reasonOf(error)}) - ` +
          `using the bundled v${this.dependencies.bundledKubectlVersion}`,
      );

      return false;
    }

    this.dependencies.logger.debug(`Acquired a lock for ${this.kubectlVersion}`);

    try {
      return await this.prepareLockedKubectl(opts);
    } catch (error) {
      this.dependencies.logger.error(`[KUBECTL]: failed to prepare kubectl ${this.kubectlVersion}`, error);
      opts.onProblem?.(
        `Failed to prepare kubectl v${this.kubectlVersion} (${this.reasonOf(error)}) - ` +
          `using the bundled v${this.dependencies.bundledKubectlVersion}`,
      );

      return false;
    } finally {
      this.dependencies.logger.debug(`[KUBECTL]: Releasing lock for ${this.kubectlVersion}`);
      await release().catch((error) =>
        this.dependencies.logger.warn(`[KUBECTL]: failed to release the lock for ${this.kubectlVersion}`, error),
      );
    }
  }

  /** {@link prepareKubectl} under the lock of the version directory. */
  protected async prepareLockedKubectl(opts: KubectlProgressOptions): Promise<boolean> {
    // Another process may have put the binary in place while this one waited
    // for the lock, in which case there is nothing left to download.
    const bundled = await this.checkBundled();
    let isValid = await this.checkBinary(this.path, !bundled);

    if (!isValid && !bundled) {
      try {
        await this.downloadKubectl(opts);
      } catch (error) {
        this.dependencies.logger.error(`[KUBECTL]: failed to download kubectl`, error);
        opts.onProblem?.(
          `Failed to download kubectl v${this.kubectlVersion} (${this.reasonOf(error)}) - ` +
            `using the bundled v${this.dependencies.bundledKubectlVersion}`,
        );

        return false;
      }

      // The longest silent stretch of the whole startup: the first `exec` of
      // a freshly written 50+ MB binary blocks in the kernel while the OS
      // validates it (macOS code signing, Windows real-time scanning), which
      // is seconds to tens of seconds. Nothing here can make it shorter, so
      // the least it can do is say what is being waited on.
      opts.onPhase?.(`Verifying kubectl v${this.kubectlVersion} ...`);
      isValid = await this.checkBinary(this.path, false);

      if (!isValid) {
        opts.onProblem?.(
          `The downloaded kubectl v${this.kubectlVersion} did not run properly - ` +
            `using the bundled v${this.dependencies.bundledKubectlVersion}`,
        );

        return false;
      }
    }

    if (!isValid) {
      opts.onProblem?.(
        `The local kubectl v${this.kubectlVersion} did not run properly - ` +
          `using the bundled v${this.dependencies.bundledKubectlVersion}`,
      );

      return false;
    }

    return true;
  }

  public async downloadKubectl(opts?: KubectlProgressOptions) {
    const checksum = this.getPinnedChecksum();

    if (!checksum) {
      throw new Error(
        `No verified checksum is pinned for kubectl ${this.kubectlVersion} on ` +
          `${this.dependencies.normalizedDownloadPlatform}/${this.dependencies.normalizedDownloadArch}`,
      );
    }

    await ensureDir(this.dependencies.getDirnameOfPath(this.path), 0o755);

    this.dependencies.logger.info(`Downloading kubectl ${this.kubectlVersion} from ${this.url} to ${this.path}`);
    // The progress carries no version, so the phase is what tells a caller
    // which kubectl is being downloaded.
    opts?.onPhase?.(`Downloading kubectl v${this.kubectlVersion} ...`);

    const response = await this.dependencies.downloadBinary(this.url, {
      onProgress: opts?.onDownloadProgress,
      stallTimeout: downloadStallTimeout,
    });

    if (!response.callWasSuccessful) {
      throw new Error(`Failed to download kubectl binary: ${response.error}`);
    }
    if (!response.response || response.response.length == 0) {
      throw new Error(`Empty content of kubectl binary`);
    }

    // The bytes must not be launchable before they have been verified, and that
    // property is expressed differently per platform: on Unix by the permission
    // bit, on Windows by the absence of an `.exe` suffix (where `chmod` only
    // maps onto the read-only flag). Appending the suffix satisfies both, so the
    // temporary name must never end in `.exe` and the `chmod` must never happen
    // before the digest matches. The same directory keeps the rename atomic.
    const temporaryPath = `${this.path}.download-${randomBytes(8).toString("hex")}`;

    try {
      const file = await fs.promises.open(temporaryPath, "wx", 0o600);

      try {
        await file.writeFile(response.response);
      } finally {
        await file.close();
      }

      // Hashed from the buffer that was just written, never from a checksum
      // fetched at runtime: asking the untrusted host for the expected digest of
      // its own response proves nothing. Because the digest is pinned, this is
      // uniform across every mirror, with no opt-out.
      const digest = createHash("sha256").update(response.response).digest("hex");

      if (digest !== checksum.sha256) {
        throw new Error(
          `Checksum mismatch for kubectl ${this.kubectlVersion} downloaded from ${this.url}: ` +
            `expected sha256 ${checksum.sha256}, got ${digest}`,
        );
      }

      await fs.promises.chmod(temporaryPath, 0o755);
      await this.renameOntoPath(temporaryPath);

      this.dependencies.logger.debug("kubectl binary download finished");
    } catch (error) {
      // Only the temporary file is removed. `this.path` was never written to,
      // so an existing good binary survives a failed download.
      await this.dependencies.unlink(temporaryPath).catch(noop);
      throw error;
    }
  }

  protected async renameOntoPath(temporaryPath: string): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await fs.promises.rename(temporaryPath, this.path);

        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException)?.code;

        if (attempt >= renameAttempts || !code || !transientRenameErrorCodes.has(code)) {
          throw error;
        }

        this.dependencies.logger.warn(
          `Could not put kubectl ${this.kubectlVersion} in place (${code}), retrying (${attempt}/${renameAttempts})`,
        );
        await delay(renameRetryDelay * attempt);
      }
    }
  }

  /**
   * Writes the init scripts of a cluster shell, `.bash_set_path` and `.zlogin`,
   * into the directory of this kubectl version, and returns that directory.
   * The scripts source the user's profile files and then put `pathPrefix` in
   * front of the `PATH` the profile leaves and `pathSuffix` after it, each
   * once, so that the profile can neither shadow the version-matched kubectl
   * nor drop the fallback.
   *
   * @param path the directories to put on `PATH`, in order, none of them an
   * empty string: an empty entry is read as the current directory
   */
  public async writeInitScripts(path: {
    readonly pathPrefix: readonly string[];
    readonly pathSuffix: readonly string[];
  }): Promise<string> {
    await ensureDir(this.dirname, 0o755);

    // Both shells run the same lines: they take every occurrence of the two
    // lists out of the PATH the profile left, then put them back around it,
    // without an empty entry when one of the three parts is empty.
    const setPath = [
      `toolsprefix="${path.pathPrefix.join(":")}"`,
      `toolssuffix="${path.pathSuffix.join(":")}"`,
      'd=":$PATH:"',
      'if test -n "$toolsprefix"; then d=${d//":$toolsprefix:"/:}; fi',
      'if test -n "$toolssuffix"; then d=${d//":$toolssuffix:"/:}; fi',
      "d=${d#:}",
      "d=${d%:}",
      'p="$toolsprefix"',
      'if test -n "$d"; then p="${p:+$p:}$d"; fi',
      'if test -n "$toolssuffix"; then p="${p:+$p:}$toolssuffix"; fi',
      'export PATH="$p"',
      "unset toolsprefix toolssuffix d p",
    ];

    const bashScriptPath = this.dependencies.joinPaths(this.dirname, ".bash_set_path");
    const bashScript = [
      initScriptVersionString,
      'tempkubeconfig="$KUBECONFIG"',
      ...saveKubeCacheDirectory,
      'test -f "/etc/profile" && . "/etc/profile"',
      'if test -f "$HOME/.bash_profile"; then',
      '  . "$HOME/.bash_profile"',
      'elif test -f "$HOME/.bash_login"; then',
      '  . "$HOME/.bash_login"',
      'elif test -f "$HOME/.profile"; then',
      '  . "$HOME/.profile"',
      "fi",
      ...setPath,
      'export KUBECONFIG="$tempkubeconfig"',
      ...restoreKubeCacheDirectory,
      `NO_PROXY=",\${NO_PROXY:-localhost},"`,
      `NO_PROXY="\${NO_PROXY//,localhost,/,}"`,
      `NO_PROXY="\${NO_PROXY//,127.0.0.1,/,}"`,
      `NO_PROXY="localhost,127.0.0.1\${NO_PROXY%,}"`,
      "export NO_PROXY",
      "unset tempkubeconfig tempkubecachedir",
    ].join("\n");

    const zshScriptPath = this.dependencies.joinPaths(this.dirname, ".zlogin");
    const zshScript = [
      initScriptVersionString,
      'tempkubeconfig="$KUBECONFIG"',
      ...saveKubeCacheDirectory,

      // restore previous ZDOTDIR
      'export ZDOTDIR="$OLD_ZDOTDIR"',

      // source all the files
      'test -f "$OLD_ZDOTDIR/.zshenv" && . "$OLD_ZDOTDIR/.zshenv"',
      'test -f "$OLD_ZDOTDIR/.zprofile" && . "$OLD_ZDOTDIR/.zprofile"',
      'test -f "$OLD_ZDOTDIR/.zlogin" && . "$OLD_ZDOTDIR/.zlogin"',
      'test -f "$OLD_ZDOTDIR/.zshrc" && . "$OLD_ZDOTDIR/.zshrc"',

      ...setPath,
      'export KUBECONFIG="$tempkubeconfig"',
      ...restoreKubeCacheDirectory,
      `NO_PROXY=",\${NO_PROXY:-localhost},"`,
      `NO_PROXY="\${NO_PROXY//,localhost,/,}"`,
      `NO_PROXY="\${NO_PROXY//,127.0.0.1,/,}"`,
      `NO_PROXY="localhost,127.0.0.1\${NO_PROXY%,}"`,
      "export NO_PROXY",
      "unset tempkubeconfig tempkubecachedir",
      "unset OLD_ZDOTDIR",
    ].join("\n");

    await Promise.all([
      fs.promises.writeFile(bashScriptPath, bashScript, { mode: 0o644 }),
      fs.promises.writeFile(zshScriptPath, zshScript, { mode: 0o644 }),
    ]);

    return this.dirname;
  }

  protected getDownloadMirror(): string {
    // MacOS packages are only available from default

    if (this.dependencies.state.downloadMirror === customPackageMirror) {
      const custom = (this.dependencies.state.downloadCustomMirror ?? "").trim().replace(/\/+$/, "");

      if (custom) {
        return custom;
      }

      // The custom mirror is selected but left empty: its entry in
      // `packageMirrors` has an empty URL, which would otherwise produce a
      // malformed download URL. Fall back to the default mirror instead.
      return packageMirrors.get(defaultPackageMirror)!.url;
    }

    const { url } =
      packageMirrors.get(this.dependencies.state.downloadMirror) ?? packageMirrors.get(defaultPackageMirror)!;

    return url;
  }
}
