/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import os from "node:os";
import path from "node:path";
import { getOrInsertWith } from "@freelensapp/utilities";
import { TerminalChannels, type TerminalMessage } from "../../common/terminal/channels";
import { clearKubeconfigEnvVars } from "../utils/clear-kube-env-vars";
import { type TerminalStatusReporter, terminalStatusReporterFor } from "./send-terminal-status";

import type { Logger } from "@freelensapp/logger";

import type { IComputedValue } from "mobx";
import type * as pty from "node-pty";
import type WebSocket from "ws";

import type { EmitAppEvent } from "../../common/app-event-bus/emit-event.injectable";
import type { Cluster } from "../../common/cluster/cluster";
import type { Stat } from "../../common/fs/stat.injectable";
import type { ComputeShellEnvironment } from "../../features/shell-sync/main/compute-shell-environment.injectable";
import type { Kubectl } from "../kubectl/kubectl";
import type { ShellSessionProcesses } from "./processes.injectable";
import type { ShellSessionEnvs } from "./shell-envs.injectable";
import type { SpawnPty } from "./spawn-pty.injectable";

export class ShellOpenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(`${message}`, options);
    this.name = this.constructor.name;
    Error.captureStackTrace(this);
  }
}

export enum WebSocketCloseEvent {
  /**
   * The connection successfully completed the purpose for which it was created.
   */
  NormalClosure = 1000,
  /**
   * The endpoint is going away, either because of a server failure or because
   * the browser is navigating away from the page that opened the connection.
   */
  GoingAway = 1001,
  /**
   * The endpoint is terminating the connection due to a protocol error.
   */
  ProtocolError = 1002,
  /**
   * The connection is being terminated because the endpoint received data of a
   * type it cannot accept. (For example, a text-only endpoint received binary
   * data.)
   */
  UnsupportedData = 1003,
  /**
   * Indicates that no status code was provided even though one was expected.
   */
  NoStatusReceived = 1005,
  /**
   * Indicates that a connection was closed abnormally (that is, with no close
   * frame being sent) when a status code is expected.
   */
  AbnormalClosure = 1006,
  /**
   *  The endpoint is terminating the connection because a message was received
   * that contained inconsistent data (e.g., non-UTF-8 data within a text message).
   */
  InvalidFramePayloadData = 1007,
  /**
   * The endpoint is terminating the connection because it received a message
   * that violates its policy. This is a generic status code, used when codes
   * 1003 and 1009 are not suitable.
   */
  PolicyViolation = 1008,
  /**
   * The endpoint is terminating the connection because a data frame was
   * received that is too large.
   */
  MessageTooBig = 1009,
  /**
   * The client is terminating the connection because it expected the server to
   * negotiate one or more extension, but the server didn't.
   */
  MissingExtension = 1010,
  /**
   * The server is terminating the connection because it encountered an
   * unexpected condition that prevented it from fulfilling the request.
   */
  InternalError = 1011,
  /**
   * The server is terminating the connection because it is restarting.
   */
  ServiceRestart = 1012,
  /**
   * The server is terminating the connection due to a temporary condition,
   * e.g. it is overloaded and is casting off some of its clients.
   */
  TryAgainLater = 1013,
  /**
   * The server was acting as a gateway or proxy and received an invalid
   * response from the upstream server. This is similar to 502 HTTP Status Code.
   */
  BadGateway = 1014,
  /**
   * Indicates that the connection was closed due to a failure to perform a TLS
   * handshake (e.g., the server certificate can't be verified).
   */
  TlsHandshake = 1015,
}

export interface ShellSessionDependencies {
  readonly isWindows: boolean;
  readonly isMac: boolean;
  readonly defaultShell: string;
  readonly logger: Logger;
  readonly userShellSetting: IComputedValue<string | null>;
  readonly appName: string;
  readonly buildVersion: string;
  /**
   * The kubeconfig pointing at the cluster's proxy. A session without a
   * cluster has none, and then the shell keeps whatever `KUBECONFIG` the user
   * has themselves.
   */
  readonly proxyKubeconfigPath?: string;
  /**
   * The directory holding the kubectl matched to the cluster's version. A
   * session without a cluster has none: it runs the user's own tools, and its
   * fallbacks are appended to `PATH` through {@link pathSuffixEntries}.
   */
  readonly directoryContainingKubectl?: string;
  /**
   * Directories appended *after* the shell's own `PATH`, so that anything the
   * user already has installed keeps winning. Empty for a cluster session.
   */
  readonly pathSuffixEntries?: string[];
  readonly shellSessionEnvs: ShellSessionEnvs;
  readonly shellSessionProcesses: ShellSessionProcesses;
  computeShellEnvironment: ComputeShellEnvironment;
  spawnPty: SpawnPty;
  emitAppEvent: EmitAppEvent;
  stat: Stat;
}

export interface ShellSessionArgs {
  kubectl?: Kubectl;
  websocket: WebSocket;
  cluster?: Cluster;
  tabId: string;
}

/**
 * The id a session without a cluster is keyed under, both for the PTY and for
 * the cached shell environment. A `ClusterId` is a uuid, so this cannot
 * collide with one.
 */
export const standaloneSessionId = "standalone";

export abstract class ShellSession {
  abstract readonly ShellType: string;

  protected running = false;
  protected readonly terminalId: string;
  protected readonly kubectl?: Kubectl;
  protected readonly websocket: WebSocket;
  protected readonly cluster?: Cluster;
  protected readonly status: TerminalStatusReporter;

  protected abstract get cwd(): string | undefined;

  protected ensureShellProcess(
    shell: string,
    args: string[],
    env: Partial<Record<string, string>>,
    cwd: string,
  ): { shellProcess: pty.IPty; resume: boolean } {
    const resume = this.dependencies.shellSessionProcesses.has(this.terminalId);
    const shellProcess = getOrInsertWith(this.dependencies.shellSessionProcesses, this.terminalId, () =>
      this.dependencies.spawnPty(shell, args, {
        rows: 30,
        cols: 80,
        cwd,
        env,
        name: "xterm-256color",
        // TODO: Something else is broken here so we need to force the use of winPty on windows
        useConpty: false,
      }),
    );

    this.dependencies.logger.info(
      `[SHELL-SESSION]: PTY for ${this.terminalId} is ${resume ? "resumed" : "started"} with PID=${shellProcess.pid}`,
    );

    return { shellProcess, resume };
  }

  constructor(
    protected readonly dependencies: ShellSessionDependencies,
    { kubectl, websocket, cluster, tabId: terminalId }: ShellSessionArgs,
  ) {
    this.kubectl = kubectl;
    this.websocket = websocket;
    this.cluster = cluster;
    this.status = terminalStatusReporterFor(websocket);
    this.terminalId = `${cluster?.id ?? standaloneSessionId}:${terminalId}`;
  }

  protected send(message: TerminalMessage): void {
    this.websocket.send(JSON.stringify(message));
  }

  protected async getCwd(env: Record<string, string | undefined>): Promise<string> {
    const cwdOptions = [this.cwd];

    if (this.dependencies.isWindows) {
      cwdOptions.push(env.USERPROFILE, os.homedir(), "C:\\");
    } else {
      cwdOptions.push(env.HOME, os.homedir());

      if (this.dependencies.isMac) {
        cwdOptions.push("/Users");
      } else {
        cwdOptions.push("/home");
      }
    }

    for (const potentialCwd of cwdOptions) {
      if (!potentialCwd) {
        continue;
      }

      try {
        const stats = await this.dependencies.stat(potentialCwd);

        if (stats.isDirectory()) {
          return potentialCwd;
        }
      } catch {
        // ignore error
      }
    }

    return "."; // Always valid
  }

  protected async openShellProcess(shell: string, args: string[], env: Record<string, string | undefined>) {
    const cwd = await this.getCwd(env);

    this.status.info("Starting shell ...");

    const { shellProcess, resume } = this.ensureShellProcess(shell, args, env, cwd);

    if (resume) {
      this.send({ type: TerminalChannels.CONNECTED });
    }

    this.running = true;
    shellProcess.onData((data) => this.send({ type: TerminalChannels.STDOUT, data }));
    shellProcess.onExit(({ exitCode }) => {
      this.dependencies.logger.info(
        `[SHELL-SESSION]: shell has exited for ${this.terminalId} closed with exitcode=${exitCode}`,
      );

      this.dependencies.shellSessionProcesses.delete(this.terminalId);

      // This might already be false because of the kill() within the websocket.on("close") handler
      if (this.running) {
        this.running = false;

        this.send({
          type: TerminalChannels.STDOUT,
          data: `\n\x1b[0m\x1b[1m[Process exited with code ${exitCode}]`,
        });
      }
    });

    this.websocket
      .on("message", (rawData: unknown): void => {
        if (!this.running) {
          return void this.dependencies.logger.debug(
            `[SHELL-SESSION]: received message from ${this.terminalId}, but shellProcess isn't running`,
          );
        }

        if (!(rawData instanceof Buffer)) {
          return void this.dependencies.logger.error(`[SHELL-SESSION]: Received message non-buffer message.`, {
            rawData,
          });
        }

        const data = rawData.toString();

        try {
          const message: TerminalMessage = JSON.parse(data);

          switch (message.type) {
            case TerminalChannels.STDIN:
              shellProcess.write(message.data);
              break;
            case TerminalChannels.RESIZE:
              shellProcess.resize(message.data.width, message.data.height);
              break;
            case TerminalChannels.PING:
              this.dependencies.logger.silly(`[SHELL-SESSION]: ${this.terminalId} ping!`);
              break;
            default:
              this.dependencies.logger.warn(
                `[SHELL-SESSION]: unknown or unhandleable message type for ${this.terminalId}`,
                message,
              );
              break;
          }
        } catch (error) {
          this.dependencies.logger.error(`[SHELL-SESSION]: failed to handle message for ${this.terminalId}`, error);
        }
      })
      .once("close", (code) => {
        this.dependencies.logger.info(
          `[SHELL-SESSION]: websocket for ${this.terminalId} closed with code=${WebSocketCloseEvent[code]}(${code})`,
          { cluster: this.cluster?.getMeta() },
        );

        const stopShellSession =
          this.running &&
          ((code !== WebSocketCloseEvent.AbnormalClosure && code !== WebSocketCloseEvent.GoingAway) ||
            (this.cluster?.disconnected.get() ?? false));

        if (stopShellSession) {
          this.running = false;

          try {
            this.dependencies.logger.info(
              `[SHELL-SESSION]: Killing shell process (pid=${shellProcess.pid}) for ${this.terminalId}`,
            );
            shellProcess.kill();
            this.dependencies.shellSessionProcesses.delete(this.terminalId);
          } catch (error) {
            this.dependencies.logger.warn(
              `[SHELL-SESSION]: failed to kill shell process (pid=${shellProcess.pid}) for ${this.terminalId}`,
              error,
            );
          }
        }

        if (code !== WebSocketCloseEvent.AbnormalClosure && code !== WebSocketCloseEvent.GoingAway) {
          this.dependencies.shellSessionProcesses.delete(this.terminalId);
        }
      });

    this.dependencies.emitAppEvent({ name: this.ShellType, action: "open" });
  }

  /**
   * Extra directories put in front of the shell's own `PATH`, right after the
   * directory containing kubectl. Only used by a session that has one.
   */
  protected getPathEntries(): string[] {
    return [];
  }

  protected async getCachedShellEnv() {
    const cacheKey = this.cluster?.id ?? standaloneSessionId;

    let env = this.dependencies.shellSessionEnvs.get(cacheKey);

    if (!env) {
      env = await this.getShellEnv({ reportStatus: true });
      this.dependencies.shellSessionEnvs.set(cacheKey, env);
    } else {
      // refresh env in the background, silently: the shell is already running
      // and its prompt must not be written over
      this.getShellEnv().then((shellEnv: any) => {
        this.dependencies.shellSessionEnvs.set(cacheKey, shellEnv);
      });
    }

    return env;
  }

  /**
   * @param reportStatus whether the terminal is still waiting for this, and so
   * should be told about it. Defaults to `false` because the background
   * refresh of a warm cache must stay silent.
   */
  protected async getShellEnv({ reportStatus = false } = {}) {
    const shell = this.dependencies.userShellSetting.get() || this.dependencies.defaultShell;

    if (reportStatus) {
      this.status.info("Resolving shell environment ...");
    }

    const result = await this.dependencies.computeShellEnvironment(shell);
    const rawEnv = (() => {
      if (result.callWasSuccessful) {
        return result.response ?? process.env;
      }

      if (reportStatus) {
        // The fallback to `process.env` is silent otherwise, and the abort
        // message in particular is already written for a user to read.
        this.status.error(result.error);
      }

      return process.env;
    })();

    const { directoryContainingKubectl, proxyKubeconfigPath, pathSuffixEntries = [] } = this.dependencies;
    const copiedEnv: Partial<Record<string, string>> = JSON.parse(JSON.stringify(rawEnv));
    /**
     * The user's own kubeconfig is the whole point of a session without a
     * cluster, so it is only cleared when there is a proxy kubeconfig to put
     * in its place.
     */
    const env = proxyKubeconfigPath === undefined ? copiedEnv : clearKubeconfigEnvVars(copiedEnv);
    /**
     * Only a cluster session puts anything in front of the user's `PATH`: it
     * must run the kubectl matched to its cluster. A session without one
     * appends its fallbacks instead, so a `kubectl` the user already has keeps
     * winning.
     */
    const pathPrefixEntries =
      directoryContainingKubectl === undefined ? [] : [directoryContainingKubectl, ...this.getPathEntries()];
    const pathStr = [...pathPrefixEntries, env.PATH, ...pathSuffixEntries].join(path.delimiter);

    delete env.DEBUG; // don't pass DEBUG into shells

    if (this.dependencies.isWindows) {
      env.PTYSHELL = shell || "powershell.exe";
      env.PATH = pathStr;
      env.LENS_SESSION = "true";
      env.WSLENV = [env.WSLENV, "KUBECONFIG/up:LENS_SESSION/u"].filter(Boolean).join(":");
    } else if (shell !== undefined) {
      env.PTYSHELL = shell;
      env.PATH = pathStr;
    } else {
      env.PTYSHELL = ""; // blank runs the system default shell
    }

    /**
     * Redirecting `ZDOTDIR` re-implements the user's own zsh startup, which is
     * only acceptable because a cluster session has to re-prepend its kubectl
     * directory from inside the shell. Without one, zsh reads its own files.
     */
    if (directoryContainingKubectl !== undefined && path.basename(env.PTYSHELL ?? "") === "zsh") {
      env.OLD_ZDOTDIR = env.ZDOTDIR || env.HOME;
      env.ZDOTDIR = directoryContainingKubectl;
      env.DISABLE_AUTO_UPDATE = "true";
    }

    env.PTYPID = process.pid.toString();

    if (proxyKubeconfigPath !== undefined) {
      env.KUBECONFIG = proxyKubeconfigPath;
    }

    env.TERM_PROGRAM = this.dependencies.appName;
    env.TERM_PROGRAM_VERSION = this.dependencies.buildVersion;

    if (this.cluster?.preferences.httpsProxy) {
      env.HTTPS_PROXY = this.cluster.preferences.httpsProxy;
    }

    env.NO_PROXY = ["localhost", "127.0.0.1", env.NO_PROXY].filter(Boolean).join();

    return env;
  }

  protected exit(code = WebSocketCloseEvent.NormalClosure) {
    if (this.websocket.readyState == this.websocket.OPEN) {
      this.websocket.close(code);
    }
  }
}
