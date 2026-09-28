/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ShellSession } from "../shell-session";

import type { GetBasenameOfPath } from "../../../common/path/get-basename.injectable";
import type { GetDirnameOfPath } from "../../../common/path/get-dirname.injectable";
import type { JoinPaths } from "../../../common/path/join-paths.injectable";
import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { ModifyTerminalShellEnv } from "../shell-env-modifier/modify-terminal-shell-env.injectable";
import type { ShellSessionArgs, ShellSessionDependencies } from "../shell-session";

export interface LocalShellSessionDependencies extends ShellSessionDependencies {
  readonly directoryForBinaries: string;
  readonly baseBundledBinariesDirectory: string;
  readonly state: UserPreferencesState;
  modifyTerminalShellEnv: ModifyTerminalShellEnv;
  joinPaths: JoinPaths;
  getDirnameOfPath: GetDirnameOfPath;
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

  protected getPathEntries(): string[] {
    return [this.dependencies.directoryForBinaries];
  }

  protected get cwd(): string | undefined {
    return this.cluster?.preferences?.terminalCWD;
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
    const { directoryContainingKubectl } = this.dependencies;
    const shellName = this.dependencies
      .getBasenameOfPath(shell)
      .replace(/\.exe$/i, "")
      .toLowerCase();

    if (directoryContainingKubectl === undefined) {
      // A session without a cluster is meant to be the user's own shell: no
      // init file, no ZDOTDIR and no PATH-forcing argument, so every shell
      // reads its own rc files the way a normal terminal emulator would. Its
      // fallback binaries are appended to PATH by `pathSuffixEntries`, and
      // forcing PATH here would undo exactly that.
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

    const pathFromPreferences = this.dependencies.state.kubectlBinariesPath || this.kubectl?.getBundledPath();
    const kubectlPathDir =
      this.dependencies.state.downloadKubectlBinaries || !pathFromPreferences
        ? directoryContainingKubectl
        : this.dependencies.getDirnameOfPath(pathFromPreferences);

    // The bundled binaries directory (e.g. resources/<arch>) holds the
    // kubectl shipped with the app. The bash/zsh init scripts already append
    // it as a fallback, so include it here as well for PowerShell and fish.
    // Otherwise, when the downloaded kubectl directory is empty (e.g. a failed
    // download), Windows PowerShell has no kubectl on PATH at all.
    const bundledBinariesDir = this.dependencies.baseBundledBinariesDirectory;

    switch (shellName) {
      case "powershell":
        return [
          "-NoExit",
          "-command",
          `& {$Env:PATH="${kubectlPathDir};${this.dependencies.directoryForBinaries};${bundledBinariesDir};$Env:PATH"}`,
        ];
      case "bash":
        return ["--init-file", this.dependencies.joinPaths(directoryContainingKubectl, ".bash_set_path")];
      case "fish":
        return [
          "--login",
          "--init-command",
          `export PATH="${kubectlPathDir}:${this.dependencies.directoryForBinaries}:${bundledBinariesDir}:$PATH"; export KUBECONFIG="${await this.dependencies.proxyKubeconfigPath}"`,
        ];
      case "zsh":
        return ["--login"];
      default:
        return [];
    }
  }
}
