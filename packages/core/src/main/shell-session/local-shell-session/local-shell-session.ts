/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ShellSession } from "../shell-session";

import type { GetBasenameOfPath } from "../../../common/path/get-basename.injectable";
import type { JoinPaths } from "../../../common/path/join-paths.injectable";
import type { ModifyTerminalShellEnv } from "../shell-env-modifier/modify-terminal-shell-env.injectable";
import type { ShellEnvOptions, ShellSessionArgs, ShellSessionDependencies } from "../shell-session";

export interface LocalShellSessionDependencies extends ShellSessionDependencies {
  /**
   * The directory holding the init scripts of a cluster shell, which put
   * {@link ShellSessionDependencies.kubeTools}' `PATH` entries back around the
   * user's `PATH` from inside the shell's own startup files. A session without
   * a cluster has none, and so has a cluster session whose scripts could not be
   * written.
   */
  readonly shellInitDirectory?: string;
  modifyTerminalShellEnv: ModifyTerminalShellEnv;
  joinPaths: JoinPaths;
  getBasenameOfPath: GetBasenameOfPath;
}

export class LocalShellSession extends ShellSession {
  ShellType = "shell";

  constructor(
    protected readonly dependencies: LocalShellSessionDependencies,
    args: ShellSessionArgs,
  ) {
    super(dependencies, args);
  }

  protected get cwd(): string | undefined {
    return this.cluster?.preferences?.terminalCWD;
  }

  protected getShellName(shell: string): string {
    return this.dependencies
      .getBasenameOfPath(shell)
      .replace(/\.exe$/i, "")
      .toLowerCase();
  }

  protected async getShellEnv(options?: ShellEnvOptions) {
    const env = await super.getShellEnv(options);
    const { shellInitDirectory } = this.dependencies;

    /**
     * Redirecting `ZDOTDIR` re-implements the user's own zsh startup, which is
     * only acceptable because a cluster session has to re-prepend its kubectl
     * directory from inside the shell. Without one, zsh reads its own files.
     */
    if (shellInitDirectory !== undefined && this.getShellName(env.PTYSHELL ?? "") === "zsh") {
      env.OLD_ZDOTDIR = env.ZDOTDIR || env.HOME;
      env.ZDOTDIR = shellInitDirectory;
      env.DISABLE_AUTO_UPDATE = "true";
    }

    return env;
  }

  public async open() {
    const shellEnv = await this.getCachedShellEnv();
    // extensions can modify the env, but only ever for a cluster
    const env = this.cluster ? this.dependencies.modifyTerminalShellEnv(this.cluster.id, shellEnv) : shellEnv;
    const shell = env.PTYSHELL;

    if (!shell) {
      throw new Error("PTYSHELL is not defined with the environment");
    }

    const args = await this.getShellArgs(shell);

    await this.openShellProcess(shell, args, env);
  }

  protected async getShellArgs(shell: string): Promise<string[]> {
    const { shellInitDirectory, kubeTools } = this.dependencies;
    const shellName = this.getShellName(shell);

    if (this.cluster === undefined) {
      // A session without a cluster is meant to be the user's own shell: no
      // init file, no ZDOTDIR and no PATH-forcing argument, so every shell
      // reads its own rc files the way a normal terminal emulator would. The
      // bundled binaries directory is appended to PATH by
      // `kubeTools.pathSuffix`, as a fallback the user's own tools win over.
      switch (shellName) {
        case "powershell":
          return ["-NoExit"];
        case "bash":
        case "fish":
        case "zsh":
          return ["--login"];
        default:
          return [];
      }
    }

    // The same directories, in the same places, as the environment's PATH and
    // the bash and zsh init scripts: Freelens' own, around the user's PATH.
    const { pathPrefix, pathSuffix } = kubeTools;

    switch (shellName) {
      case "powershell":
        return ["-NoExit", "-command", `& {$Env:PATH="${[...pathPrefix, "$Env:PATH", ...pathSuffix].join(";")}"}`];
      case "bash":
        // Without its init file, bash reads no rc file either, so the
        // environment's PATH and KUBECONFIG stay as the session set them.
        return shellInitDirectory === undefined
          ? ["--norc"]
          : ["--init-file", this.dependencies.joinPaths(shellInitDirectory, ".bash_set_path")];
      case "fish":
        return [
          "--login",
          "--init-command",
          `export PATH="${[...pathPrefix, "$PATH", ...pathSuffix].join(":")}"; export KUBECONFIG="${this.dependencies.proxyKubeconfigPath}"; export KUBECACHEDIR="${this.dependencies.proxyCacheDirectoryPath}"`,
        ];
      case "zsh":
        return ["--login"];
      default:
        return [];
    }
  }
}
