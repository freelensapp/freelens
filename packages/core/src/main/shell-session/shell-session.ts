/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import os from "node:os";
import { getOrInsertWith } from "@freelensapp/utilities";
import { TerminalChannels, type TerminalMessage } from "../../common/terminal/channels";
import { freelensProxyTokenEnvVar } from "../freelens-proxy/freelens-proxy-token";
import { composeKubeToolsEnvironment } from "../kube-tools/kube-tools";
import { type TerminalStatusReporter, terminalStatusReporterFor } from "./send-terminal-status";
import { closedDuring } from "./websocket-closed";

import type { Logger } from "@freelensapp/logger";

import type { IComputedValue } from "mobx";
import type * as pty from "node-pty";
import type WebSocket from "ws";

import type { EmitAppEvent } from "../../common/app-event-bus/emit-event.injectable";
import type { Cluster } from "../../common/cluster/cluster";
import type { Stat } from "../../common/fs/stat.injectable";
import type { ComputeUserShellEnvironment } from "../kube-tools/compute-user-shell-environment.injectable";
import type { GetUserShell } from "../kube-tools/get-user-shell.injectable";
import type { KubeTools } from "../kube-tools/kube-tools";
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
  readonly logger: Logger;
  readonly appName: string;
  readonly buildVersion: string;
  /**
   * The kubectl and helm the session runs, and the directories of Freelens'
   * own binaries it puts on `PATH` around the user's own.
   */
  readonly kubeTools: KubeTools;
  /**
   * The kubeconfig pointing at the cluster's proxy. A session without a
   * cluster has none, and then the shell keeps whatever `KUBECONFIG` the user
   * has themselves.
   */
  readonly proxyKubeconfigPath?: string;
  /**
   * The cache directory of {@link proxyKubeconfigPath}, exported as
   * `KUBECACHEDIR` so that kubectl and helm keep their cache for the proxy out
   * of `~/.kube/cache`. Set exactly when the proxy kubeconfig is.
   */
  readonly proxyCacheDirectoryPath?: string;
  /**
   * The freelens-proxy token, exported as `FREELENS_PROXY_TOKEN` when the proxy
   * kubeconfig is set, so that kubectl and helm in the terminal reach the
   * cluster through the proxy.
   */
  readonly freelensProxyToken: string;
  /**
   * The application's proxy preference, exported as `HTTPS_PROXY` by a session
   * without a cluster. A session for a cluster exports the cluster's instead.
   */
  readonly applicationHttpsProxy?: IComputedValue<string | undefined>;
  readonly shellSessionEnvs: ShellSessionEnvs;
  readonly shellSessionProcesses: ShellSessionProcesses;
  computeUserShellEnvironment: ComputeUserShellEnvironment;
  getUserShell: GetUserShell;
  spawnPty: SpawnPty;
  emitAppEvent: EmitAppEvent;
  stat: Stat;
}

export interface ShellSessionArgs {
  kubectl?: Kubectl;
  websocket: WebSocket;
  /**
   * Aborted once {@link websocket} closes, taken when the socket was handed
   * over: by the time the session exists, its `close` event may have fired.
   */
  signal: AbortSignal;
  cluster?: Cluster;
  tabId: string;
}

/**
 * The id a session without a cluster is keyed under, both for the PTY and for
 * the cached shell environment. A `ClusterId` is a uuid, so this cannot
 * collide with one.
 */
export const standaloneSessionId = "standalone";

/**
 * The last output of each PTY, sent again to a renderer that reconnects to it,
 * as after a reload, so that its terminal does not start out empty. It lives
 * as long as the PTY and is never written anywhere.
 */
const lastOutputs = new WeakMap<pty.IPty, string>();

export interface ShellEnvOptions {
  readonly shell?: string;
  readonly reportStatus?: boolean;
}

export abstract class ShellSession {
  abstract readonly ShellType: string;

  protected running = false;
  protected readonly terminalId: string;
  protected readonly kubectl?: Kubectl;
  protected readonly websocket: WebSocket;
  protected readonly signal: AbortSignal;
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
        // Windows only: run on node-pty's bundled, Microsoft-signed conpty.dll
        // and OpenConsole.exe rather than the system ConPTY. With the system
        // one, kill() forks the Electron binary as Node to attach to the
        // shell's console and list its processes, which endpoint protection
        // heuristics flag (#2729).
        useConptyDll: true,
      }),
    );

    const logPid = () =>
      this.dependencies.logger.info(
        `[SHELL-SESSION]: PTY for ${this.terminalId} is ${resume ? "resumed" : "started"} with PID=${shellProcess.pid}`,
      );

    if (shellProcess.pid > 0) {
      logPid();
    } else {
      // On Windows node-pty learns the shell's pid only once ConPTY has
      // connected, which happens before the first output arrives.
      const firstData = shellProcess.onData(() => {
        firstData.dispose();
        logPid();
      });
    }

    return { shellProcess, resume };
  }

  constructor(
    protected readonly dependencies: ShellSessionDependencies,
    { kubectl, websocket, signal, cluster, tabId: terminalId }: ShellSessionArgs,
  ) {
    this.kubectl = kubectl;
    this.websocket = websocket;
    this.signal = signal;
    this.cluster = cluster;
    this.status = terminalStatusReporterFor(websocket);
    this.terminalId = `${cluster?.id ?? standaloneSessionId}:${terminalId}`;
  }

  /**
   * Whether the start stops here because the terminal has closed.
   */
  protected closedDuring(stage: string): boolean {
    return closedDuring(this.signal, this.dependencies.logger, this.terminalId, stage);
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

    // The `close` handler below would be attached to a socket that has already
    // closed, and nothing else would ever kill the PTY.
    if (this.closedDuring("preparing the shell")) {
      return;
    }

    this.status.info("Starting shell ...");

    const { shellProcess, resume } = this.ensureShellProcess(shell, args, env, cwd);

    if (resume) {
      this.send({ type: TerminalChannels.CONNECTED });

      const lastOutput = lastOutputs.get(shellProcess);

      if (lastOutput) {
        this.send({ type: TerminalChannels.STDOUT, data: lastOutput });
      }
    }

    this.running = true;
    shellProcess.onData((data) => {
      lastOutputs.set(shellProcess, data);
      this.send({ type: TerminalChannels.STDOUT, data });
    });
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

  protected async getCachedShellEnv() {
    // Keyed by the shell too: the environment carries the shell to start as
    // `PTYSHELL`, and is the one of that shell, so a changed shell setting
    // must not start the next terminal with the environment of the old one.
    const shell = this.dependencies.getUserShell();
    const cacheKey = `${this.cluster?.id ?? standaloneSessionId}:${shell}`;

    let env = this.dependencies.shellSessionEnvs.get(cacheKey);

    if (!env) {
      env = await this.getShellEnv({ shell, reportStatus: true });
      this.dependencies.shellSessionEnvs.set(cacheKey, env);
    } else {
      // refresh env in the background, silently: the shell is already running
      // and its prompt must not be written over
      this.getShellEnv({ shell }).then((shellEnv: any) => {
        this.dependencies.shellSessionEnvs.set(cacheKey, shellEnv);
      });
    }

    return env;
  }

  /**
   * @param shell the shell to start, by default the one the user setting gives now.
   * @param reportStatus whether the terminal is still waiting for this, and so
   * should be told about it. Defaults to `false` because the background
   * refresh of a warm cache must stay silent.
   */
  protected async getShellEnv({ shell: requestedShell, reportStatus = false }: ShellEnvOptions = {}) {
    if (reportStatus) {
      this.status.info("Resolving shell environment ...");
    }

    const { shell, environment, error } = await this.dependencies.computeUserShellEnvironment(requestedShell);

    if (error !== undefined && reportStatus) {
      // The fallback to `process.env` is silent otherwise, and the abort
      // message in particular is already written for a user to read.
      this.status.error(error);
    }

    const {
      kubeTools,
      proxyKubeconfigPath,
      proxyCacheDirectoryPath,
      freelensProxyToken,
      applicationHttpsProxy,
      isWindows,
    } = this.dependencies;
    const env = composeKubeToolsEnvironment({
      baseEnvironment: environment,
      tools: kubeTools,
      clusterAccess:
        proxyKubeconfigPath === undefined || proxyCacheDirectoryPath === undefined
          ? undefined
          : {
              kubeconfigPath: proxyKubeconfigPath,
              cacheDirectoryPath: proxyCacheDirectoryPath,
              token: freelensProxyToken,
            },
      httpsProxy: this.cluster ? this.cluster.preferences.httpsProxy : applicationHttpsProxy?.get(),
      isWindows,
    });

    if (isWindows) {
      env.PTYSHELL = shell || "powershell.exe";
      env.LENS_SESSION = "true";
      // The token has no flag: it has to travel both ways, into WSL and back
      // out to the Windows credential helper that a kubectl in WSL runs.
      env.WSLENV = [env.WSLENV, `KUBECONFIG/up:KUBECACHEDIR/up:LENS_SESSION/u:${freelensProxyTokenEnvVar}`]
        .filter(Boolean)
        .join(":");
    } else {
      env.PTYSHELL = shell;
    }

    env.PTYPID = process.pid.toString();
    env.TERM_PROGRAM = this.dependencies.appName;
    env.TERM_PROGRAM_VERSION = this.dependencies.buildVersion;

    return env;
  }

  protected exit(code = WebSocketCloseEvent.NormalClosure) {
    if (this.websocket.readyState == this.websocket.OPEN) {
      this.websocket.close(code);
    }
  }
}
