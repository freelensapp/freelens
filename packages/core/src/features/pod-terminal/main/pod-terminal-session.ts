/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ShellSession } from "../../../main/shell-session/shell-session";

import type * as pty from "node-pty";

import type { Cluster } from "../../../common/cluster/cluster";
import type { ExecFile } from "../../../common/fs/exec-file.injectable";
import type { Kubectl } from "../../../main/kubectl/kubectl";
import type { ShellSessionArgs, ShellSessionDependencies } from "../../../main/shell-session/shell-session";
import type { PodTerminalTarget } from "../common/pod-terminal";

export interface PodTerminalSessionArgs extends ShellSessionArgs {
  target: PodTerminalTarget;
  cluster: Cluster;
  kubectl: Kubectl;
}

export interface PodTerminalSessionDependencies extends ShellSessionDependencies {
  execFile: ExecFile;
}

/**
 * The private OSC sequence in which the shell started by `kubectl exec` in a
 * Linux container reports its own PID, before anything else it writes. xterm.js
 * ignores an OSC it has no handler for, so the sequence never shows.
 */
const pidReportCode = "6973";
const pidReportPattern = new RegExp(`\\x1b\\]${pidReportCode};freelens-pod-shell-pid=(\\d+)\\x07`);
/**
 * How much of the first output is searched for the report. It is the first
 * thing the shell writes, so only what kubectl writes before it, such as the
 * container it defaulted to, comes first.
 */
const pidReportSearchLength = 4096;

/**
 * The shell of a Linux container. It reports its PID and then replaces itself
 * with the first shell the image has, so that the PID is the shell's, and the
 * shell is the session leader of the terminal the container runtime gave it.
 * `command -v` first, because a failed `exec` would end the wrapper.
 */
export const linuxPodShellScript = [
  `printf '\\033]${pidReportCode};freelens-pod-shell-pid=%s\\007' "$$"`,
  "command -v bash >/dev/null 2>&1 && exec bash",
  "command -v ash >/dev/null 2>&1 && exec ash",
  "exec sh",
].join("; ");

/**
 * Ends the shell whose PID is the first argument. SIGHUP is what a closed
 * terminal sends: bash passes it on to its jobs, and the session leader's exit
 * hangs the terminal up for whatever runs in the foreground, an editor or a
 * pager as much as the prompt.
 */
const linuxPodShellStopScript = 'kill -HUP "$1"';

/**
 * The PIDs, in the container, of the shells of the PTYs that run `kubectl
 * exec`. Kept with the PTY rather than the session, as a PTY outlives the
 * session that started it when the window reloads.
 */
const containerShellPids = new WeakMap<pty.IPty, number>();

/**
 * Unique to each PTY of a Windows pod shell: it is on the command line of the
 * PowerShell in the container, which is how the session finds it again.
 */
const windowsShellMarkers = new WeakMap<pty.IPty, string>();

/**
 * A terminal for a container of a pod, run by kubectl from main with an
 * argument array: `kubectl exec` for a shell of its own, `kubectl attach` for
 * the container's main process.
 *
 * Closing the tab kills the local kubectl. That is all `attach` needs, as it
 * only detaches. The shell `exec` started is another matter: the container
 * runtime does not end it when its client goes away, so the session ends it
 * with a second `exec`.
 */
export class PodTerminalSession extends ShellSession {
  readonly ShellType: string;

  protected readonly cwd: string | undefined = undefined;
  protected readonly target: PodTerminalTarget;
  /**
   * The environment kubectl runs with, set once the session opens.
   */
  protected env?: Record<string, string | undefined>;
  /**
   * The marker of a Windows pod shell this session starts. Made before the PTY
   * exists, as its arguments carry it, and kept with the PTY once it does.
   */
  protected readonly windowsShellMarker = `freelens-pod-shell-${globalThis.crypto.randomUUID().replaceAll("-", "")}`;

  constructor(
    protected readonly dependencies: PodTerminalSessionDependencies,
    { target, ...args }: PodTerminalSessionArgs,
  ) {
    super(dependencies, args);
    this.target = target;
    this.ShellType = target.mode === "exec" ? "pod-shell" : "pod-attach";
  }

  public async open() {
    const env = await this.getCachedShellEnv();

    this.env = env;

    await this.openShellProcess(this.dependencies.kubeTools.kubectlPath, this.getTerminalArgs(), env);
  }

  /**
   * The arguments that select the container, ahead of any of the subcommand's
   * own.
   */
  protected getTargetArgs(): string[] {
    const { namespace, pod, container } = this.target;
    const { proxyCacheDirectoryPath } = this.dependencies;
    // `KUBECACHEDIR` is in the environment already, but the kubectl matched to
    // an older cluster may predate it.
    const cacheDirArgs = proxyCacheDirectoryPath === undefined ? [] : ["--cache-dir", proxyCacheDirectoryPath];
    const containerArgs = container ? ["-c", container] : [];

    return [...cacheDirArgs, "-n", namespace, pod, ...containerArgs];
  }

  protected getTerminalArgs(): string[] {
    if (this.target.mode === "attach") {
      return ["attach", "-i", "-t", ...this.getTargetArgs()];
    }

    return ["exec", "-i", "-t", ...this.getTargetArgs(), "--", ...this.getShellCommand()];
  }

  protected getShellCommand(): string[] {
    if (this.target.windows) {
      return ["powershell", "-NoLogo", "-NoExit", "-Command", `# ${this.windowsShellMarker}`];
    }

    return ["sh", "-c", linuxPodShellScript];
  }

  protected shellProcessStarted(shellProcess: pty.IPty): void {
    if (this.target.mode !== "exec") {
      return;
    }

    if (this.target.windows) {
      windowsShellMarkers.set(shellProcess, this.windowsShellMarker);

      return;
    }

    let output = "";
    const listener = shellProcess.onData((data) => {
      output += data;

      const match = pidReportPattern.exec(output);

      if (match) {
        listener.dispose();
        containerShellPids.set(shellProcess, Number(match[1]));
      } else if (output.length > pidReportSearchLength) {
        listener.dispose();
        this.dependencies.logger.warn(
          `[POD-SHELL]: the shell of ${this.terminalId} reported no PID, it will be left running when the tab closes`,
        );
      }
    });
  }

  protected shellProcessStopped(shellProcess: pty.IPty): void {
    const stopCommand = this.getStopCommand(shellProcess);

    if (!stopCommand) {
      return;
    }

    const { kubectlPath } = this.dependencies.kubeTools;
    const { namespace, pod } = this.target;

    this.dependencies.logger.info(`[POD-SHELL]: ending the shell of ${this.terminalId} in ${namespace}/${pod}`);

    void this.dependencies
      .execFile(kubectlPath, ["exec", ...this.getTargetArgs(), "--", ...stopCommand], {
        env: this.env,
        timeout: 30_000,
      })
      .then((result) => {
        if (!result.callWasSuccessful) {
          this.dependencies.logger.warn(
            `[POD-SHELL]: failed to end the shell of ${this.terminalId} in ${namespace}/${pod}: ${result.error.stderr || result.error.message}`,
          );
        }
      });
  }

  /**
   * The command that ends the shell of {@link shellProcess} in the container,
   * or `undefined` when there is none to end.
   */
  protected getStopCommand(shellProcess: pty.IPty): string[] | undefined {
    if (this.target.mode !== "exec") {
      return undefined;
    }

    if (this.target.windows) {
      const marker = windowsShellMarkers.get(shellProcess);

      if (!marker) {
        return undefined;
      }

      // The command line of this PowerShell has the marker too, so it leaves
      // itself out. `/T` ends what the shell runs along with it.
      return [
        "powershell",
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%${marker}%'" | Where-Object { $_.ProcessId -ne $PID } | ForEach-Object { taskkill.exe /T /F /PID $_.ProcessId }`,
      ];
    }

    const pid = containerShellPids.get(shellProcess);

    if (pid === undefined) {
      this.dependencies.logger.warn(`[POD-SHELL]: the PID of the shell of ${this.terminalId} is unknown, leaving it`);

      return undefined;
    }

    return ["sh", "-c", linuxPodShellStopScript, "sh", String(pid)];
  }
}
