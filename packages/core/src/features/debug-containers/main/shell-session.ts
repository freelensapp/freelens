/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { TerminalChannels } from "../../../common/terminal/channels";
import { ShellSession } from "../../../main/shell-session/shell-session";
import { debugContainerAttachArgs } from "../common/debug-container";

import type { ShellSessionArgs, ShellSessionDependencies } from "../../../main/shell-session/shell-session";
import type { DebugContainerSpec } from "../common/debug-container";

export class DebugContainerShellSession extends ShellSession {
  readonly ShellType = "debug-container-shell";
  protected readonly cwd = undefined;

  constructor(
    dependencies: ShellSessionDependencies,
    private readonly args: ShellSessionArgs & { debugContainer: DebugContainerSpec },
  ) {
    super(dependencies, args);
  }

  async open() {
    if (!this.kubectl || !this.dependencies.proxyKubeconfigPath) throw new Error("A debugger requires a cluster");
    const env = await this.getCachedShellEnv();

    if (this.closedDuring("resolving the debug shell environment")) return;
    this.status.info(`Attaching to ${this.args.debugContainer.container} ...`);

    const resume = this.dependencies.shellSessionProcesses.has(this.terminalId);

    await this.openShellProcess(
      this.dependencies.kubeTools.kubectlPath,
      ["--kubeconfig", this.dependencies.proxyKubeconfigPath, ...debugContainerAttachArgs(this.args.debugContainer)],
      env,
    );

    // Sent once kubectl has started, which prints its own hint about the prompt only after it has
    // connected, so this line comes first. A resumed session has shown it already.
    if (this.running && !resume) {
      this.send({
        type: TerminalChannels.STDOUT,
        data: "Typing exit in the shell stops the debug container. Closing this tab leaves it running.\r\n",
      });
    }
  }
}
