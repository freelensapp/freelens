/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ShellSession } from "../../../main/shell-session/shell-session";

import type { ShellSessionArgs, ShellSessionDependencies } from "../../../main/shell-session/shell-session";
import type { DebugContainerReference } from "../common/debug-container";

export class DebugContainerShellSession extends ShellSession {
  readonly ShellType = "debug-container-shell";
  protected readonly cwd = undefined;

  constructor(
    dependencies: ShellSessionDependencies,
    private readonly args: ShellSessionArgs & { debugContainer: DebugContainerReference },
  ) {
    super(dependencies, args);
  }

  async open() {
    if (!this.kubectl || !this.dependencies.proxyKubeconfigPath) throw new Error("A debugger requires a cluster");
    const { namespace, name, containerName } = this.args.debugContainer;
    const env = await this.getCachedShellEnv();

    this.status.info(`Opening shell in ${containerName} ...`);
    await this.openShellProcess(
      await this.kubectl.getPath(),
      [
        "--kubeconfig",
        this.dependencies.proxyKubeconfigPath,
        "exec",
        "-i",
        "-t",
        "--namespace",
        namespace,
        name,
        "--container",
        containerName,
        "--",
        "sh",
        "-c",
        "if command -v bash >/dev/null 2>&1; then exec bash; elif command -v ash >/dev/null 2>&1; then exec ash; else exec sh; fi",
      ],
      env,
    );
  }
}
