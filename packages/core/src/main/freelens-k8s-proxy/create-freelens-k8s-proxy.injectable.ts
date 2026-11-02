/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { observable, when } from "mobx";
import getDirnameOfPathInjectable from "../../common/path/get-dirname.injectable";
import randomBytesInjectable from "../../common/utils/random-bytes.injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import spawnInjectable from "../child-process/spawn.injectable";
import broadcastConnectionUpdateInjectable from "../cluster/broadcast-connection-update.injectable";
import getPortFromStreamInjectable from "../utils/get-port-from-stream.injectable";
import freelensK8sProxyCertificateInjectable from "./freelens-k8s-proxy-certificate.injectable";
import freeLensK8sProxyPathInjectable from "./freelens-k8s-proxy-path.injectable";
import waitUntilPortIsUsedInjectable from "./wait-until-port-is-used/wait-until-port-is-used.injectable";
import type { ChildProcess } from "node:child_process";

import type { SelfSignedCert } from "../../common/certificate/certificate";
import type { Cluster } from "../../common/cluster/cluster";

export interface FreelensK8sProxy {
  readonly apiPrefix: string;
  readonly port: number;
  /**
   * Whether the proxy process is serving: true from the moment it is ready
   * until it exits, on its own or through `exit()`.
   */
  readonly isRunning: boolean;
  run: () => Promise<void>;
  exit: () => void;
}

export type CreateFreelensK8sProxy = (env: NodeJS.ProcessEnv) => FreelensK8sProxy;

const startingServeRegex = /starting to serve on (?<address>.+)/i;

/**
 * How many processes one start spawns when they do not get to serving: when a
 * process prints no port in time, or does not listen on the one it printed. A
 * process that exits or fails to spawn before then ends the start at once,
 * because the next one would fail the same way; the next request starts again.
 */
const maxStartAttempts = 3;

/**
 * The delay before the second process of a start, doubled for each one after.
 */
const firstRestartDelayMs = 1000;

/**
 * How much of what a process writes to stderr while it starts is kept, to say
 * why the start failed.
 */
const maxStartupStderrLength = 2000;

/**
 * Resolves after `ms`, or rejects with the reason of the signal once it aborts.
 */
const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Rejects with the reason of the signal once it aborts, and never resolves.
 */
const whenAborted = (signal: AbortSignal) =>
  new Promise<never>((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
    } else {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }
  });

const createFreelensK8sProxyInjectable = getInjectable({
  id: "create-freelens-k8s-proxy",

  instantiate: (di, cluster): CreateFreelensK8sProxy => {
    const freeLensK8sProxyPath = di.inject(freeLensK8sProxyPathInjectable);
    const spawn = di.inject(spawnInjectable);
    const logger = di.inject(loggerInjectionToken);
    const waitUntilPortIsUsed = di.inject(waitUntilPortIsUsedInjectable);
    const getPortFromStream = di.inject(getPortFromStreamInjectable);
    const getDirnameOfPath = di.inject(getDirnameOfPathInjectable);
    const randomBytes = di.inject(randomBytesInjectable);
    const clusterApiUrl = di.inject(clusterApiUrlInjectable, cluster);
    const broadcastConnectionUpdate = di.inject(broadcastConnectionUpdateInjectable, cluster);

    return (env) => {
      let port: number | undefined;
      let proxyProcess: ChildProcess | undefined;
      let starting: Promise<void> | undefined;
      // Aborted when the start in progress cannot succeed: its process ended,
      // or `exit()` stopped it
      let startInProgress: AbortController | undefined;
      const ready = observable.box(false);
      const apiPrefix = `/${randomBytes(8).toString("hex")}`;

      const stopProcess = () => {
        ready.set(false);

        if (proxyProcess) {
          logger.debug("[KUBE-AUTH]: stopping local proxy", cluster.getMeta());
          proxyProcess.removeAllListeners();
          proxyProcess.stderr?.removeAllListeners();
          proxyProcess.stdout?.removeAllListeners();
          proxyProcess.kill();
          proxyProcess = undefined;
        }
      };

      const exit = () => {
        startInProgress?.abort(new Error("freelens-k8s-proxy was stopped before it was ready"));
        stopProcess();
      };

      const run = (): Promise<void> => {
        // Concurrent callers share one start, so they get one process: there
        // is no process to see until the start has spawned it.
        if (starting) {
          return starting;
        }

        if (proxyProcess) {
          return when(() => ready.get());
        }

        starting = start().finally(() => {
          starting = undefined;
        });

        return starting;
      };

      /**
       * Spawns one process and waits until it serves. Resolves with why it
       * did not when another process may fix that, and rejects when the start
       * is aborted.
       */
      const spawnProcess = async (certificate: SelfSignedCert, start: AbortController): Promise<string | undefined> => {
        let startupStderr = "";

        const failedStart = (message: string) => {
          const output = startupStderr.trim();

          return new Error(output ? `${message}: ${output}` : message);
        };

        proxyProcess = spawn(freeLensK8sProxyPath, ["proxy"], {
          env: {
            ...env,
            KUBECONFIG: cluster.kubeConfigPath.get(),
            FREELENS_PROXY_CONTEXT: cluster.contextName.get(),
            FREELENS_PROXY_API_PREFIX: apiPrefix,
            FREELENS_PROXY_KEY: certificate.private,
            FREELENS_PROXY_CERT: certificate.cert,
          },
          cwd: getDirnameOfPath(cluster.kubeConfigPath.get()),
        });
        proxyProcess.on("error", (error) => {
          broadcastConnectionUpdate({
            level: "error",
            message: error.message,
          });
          start.abort(failedStart(`freelens-k8s-proxy failed before it was ready: ${error.message}`));
          stopProcess();
        });

        proxyProcess.on("exit", (code, signal) => {
          if (code) {
            broadcastConnectionUpdate({
              level: "error",
              message: `proxy exited with code: ${code}`,
            });
          } else {
            broadcastConnectionUpdate({
              level: "info",
              message: "proxy exited successfully",
            });
          }
          // Once the process is serving, its start is over and this does nothing
          start.abort(
            failedStart(
              `freelens-k8s-proxy exited with ${code === null ? `signal ${signal}` : `code ${code}`} before it was ready`,
            ),
          );
          stopProcess();
        });

        proxyProcess.on("disconnect", () => {
          broadcastConnectionUpdate({
            level: "error",
            message: "Proxy disconnected communications",
          });
          start.abort(failedStart("freelens-k8s-proxy disconnected before it was ready"));
          stopProcess();
        });

        assert(proxyProcess.stderr);
        assert(proxyProcess.stdout);

        proxyProcess.stderr.on("data", (data: Buffer) => {
          if (data.includes("http: TLS handshake error")) {
            return;
          }

          if (!ready.get()) {
            startupStderr = (startupStderr + data.toString()).slice(-maxStartupStderrLength);
          }

          broadcastConnectionUpdate({
            level: "error",
            message: data.toString(),
          });
        });

        proxyProcess.stdout.on("data", (data: Buffer) => {
          if (typeof port === "number") {
            broadcastConnectionUpdate({
              level: "info",
              message: data.toString(),
            });
          }
        });

        try {
          port = await getPortFromStream(proxyProcess.stdout, {
            lineRegex: startingServeRegex,
            onFind: () =>
              broadcastConnectionUpdate({
                level: "info",
                message: "Authentication proxy started",
              }),
            signal: start.signal,
          });
        } catch (error) {
          start.signal.throwIfAborted();
          logger.warn("[FREELENS-K8S-PROXY]: getPortFromStream failed", error);

          return "Proxy port can't be found";
        }

        logger.info(`[FREELENS-K8S-PROXY]: found port=${port}`);

        try {
          await Promise.race([waitUntilPortIsUsed(port, 500, 10000), whenAborted(start.signal)]);
        } catch (error) {
          start.signal.throwIfAborted();
          logger.warn("[FREELENS-K8S-PROXY]: waitUntilUsed failed", error);

          return "Proxy port failed to be used within time limit";
        }

        ready.set(true);

        return undefined;
      };

      const start = async (): Promise<void> => {
        const thisStart = new AbortController();

        startInProgress = thisStart;

        try {
          const apiUrl = await clusterApiUrl();
          const certificate = await di.inject(freelensK8sProxyCertificateInjectable, apiUrl.hostname);

          for (let attempt = 1; ; attempt += 1) {
            thisStart.signal.throwIfAborted();

            const failure = await spawnProcess(certificate, thisStart);

            if (!failure) {
              return;
            }

            stopProcess();

            if (attempt >= maxStartAttempts) {
              broadcastConnectionUpdate({
                level: "error",
                message: `${failure}, giving up after ${attempt} attempts`,
              });

              throw new Error(`freelens-k8s-proxy failed to start after ${attempt} attempts: ${failure}`);
            }

            broadcastConnectionUpdate({
              level: "error",
              message: `${failure}, restarting...`,
            });

            await delay(firstRestartDelayMs * 2 ** (attempt - 1), thisStart.signal);
          }
        } catch (error) {
          stopProcess();

          throw error;
        } finally {
          if (startInProgress === thisStart) {
            startInProgress = undefined;
          }
        }
      };

      return {
        apiPrefix,
        exit,
        run,
        get isRunning() {
          return ready.get();
        },
        get port() {
          assert(port, "port has not yet been initialized");

          return port;
        },
      };
    };
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default createFreelensK8sProxyInjectable;
