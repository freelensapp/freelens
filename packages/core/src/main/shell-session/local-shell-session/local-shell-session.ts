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
    return this.cluster.preferences?.terminalCWD;
  }

  public async open() {
    // extensions can modify the env
    const env = this.dependencies.modifyTerminalShellEnv(this.cluster.id, await this.getCachedShellEnv());
    const shell = env.PTYSHELL;

    if (!shell) {
      throw new Error("PTYSHELL is not defined with the environment");
    }

    const args = await this.getShellArgs(shell);

    await this.openShellProcess(shell, args, env);
  }

  protected async getShellArgs(shell: string): Promise<string[]> {
    const pathFromPreferences = this.dependencies.state.kubectlBinariesPath || this.kubectl.getBundledPath();
    const kubectlPathDir = this.dependencies.state.downloadKubectlBinaries
      ? this.dependencies.directoryContainingKubectl
      : this.dependencies.getDirnameOfPath(pathFromPreferences);

    const shellName = this.dependencies
      .getBasenameOfPath(shell)
      .replace(/\.exe$/i, "")
      .toLowerCase();

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
        return [
          "--init-file",
          this.dependencies.joinPaths(this.dependencies.directoryContainingKubectl, ".bash_set_path"),
        ];
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
