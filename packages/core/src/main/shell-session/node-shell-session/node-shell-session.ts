/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { NodeApi } from "@freelensapp/kube-api";
import { CoreV1Api, Watch } from "@kubernetes/client-node";
import { once } from "es-toolkit";
import { get } from "es-toolkit/compat";
import { v4 as uuid } from "uuid";
import { initialNodeShellImage, initialNodeShellWindowsImage } from "../../../common/cluster-types";
import { ShellOpenError, ShellSession } from "../shell-session";

import type { Pod } from "@freelensapp/kube-object";

import type { KubeConfig } from "@kubernetes/client-node";

import type { Cluster } from "../../../common/cluster/cluster";
import type { CreateKubeApi } from "../../../common/k8s-api/create-kube-api.injectable";
import type { CreateKubeJsonApiForCluster } from "../../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import type { LoadProxyKubeconfig } from "../../cluster/load-proxy-kubeconfig.injectable";
import type { Kubectl } from "../../kubectl/kubectl";
import type { ShellSessionArgs, ShellSessionDependencies } from "../shell-session";

/**
 * A node shell is a cluster concept by definition, so unlike the base class it
 * always has both a cluster and a kubectl.
 */
export interface NodeShellSessionArgs extends ShellSessionArgs {
  nodeName: string;
  cluster: Cluster;
  kubectl: Kubectl;
}

export interface NodeShellSessionDependencies extends ShellSessionDependencies {
  createKubeJsonApiForCluster: CreateKubeJsonApiForCluster;
  createKubeApi: CreateKubeApi;
  loadProxyKubeconfig: LoadProxyKubeconfig;
}

export class NodeShellSession extends ShellSession {
  ShellType = "node-shell";

  protected readonly podName = `node-shell-${uuid()}`;
  /**
   * The request that creates the pod, once it is sent.
   */
  protected podCreation?: Promise<unknown>;
  protected readonly nodeName: string;
  protected readonly cwd: string | undefined = undefined;

  constructor(
    protected readonly dependencies: NodeShellSessionDependencies,
    { nodeName, ...args }: NodeShellSessionArgs,
  ) {
    super(dependencies, args);
    this.nodeName = nodeName;
  }

  public async open() {
    const proxyKubeconfig = await this.dependencies.loadProxyKubeconfig();

    if (this.closedDuring("loading the proxy kubeconfig")) {
      return;
    }

    const coreApi = proxyKubeconfig.makeApiClient(CoreV1Api);

    const cleanup = once(() => {
      const { podCreation } = this;

      // Not asked for: the start stopped before the pod was requested.
      if (!podCreation) {
        return;
      }

      // A delete sent while the creation is still in flight can overtake it,
      // find no pod, and leave the pod created after it behind. A creation
      // that failed is deleted all the same, as it may still have left a pod.
      podCreation
        .catch(() => undefined)
        .then(() => coreApi.deleteNamespacedPod({ name: this.podName, namespace: "kube-system" }))
        .catch((error) => this.dependencies.logger.warn(`[NODE-SHELL]: failed to remove pod shell`, error));
    });

    this.signal.addEventListener("abort", cleanup, { once: true });

    try {
      this.status.info("Creating node shell pod ...");
      await this.createNodeShellPod(coreApi);

      // The pod, if it was requested, is removed by `cleanup` on the close.
      if (this.closedDuring("creating the node shell pod")) {
        return;
      }

      this.status.info("Waiting for the node shell pod ...");
      await this.waitForRunningPod(proxyKubeconfig);

      if (this.closedDuring("waiting for the node shell pod")) {
        return;
      }
    } catch (error) {
      cleanup();

      // The wait gives up on the close, so this is no failure to report.
      if (this.closedDuring("starting the node shell pod")) {
        return;
      }

      // Not STDOUT: that marks the session as ready and clears the buffer, so
      // the message used to erase itself.
      this.status.error(
        `Error occurred: ${get(error, "response.body.message", error ? String(error) : "unknown error")}`,
      );

      throw new ShellOpenError("failed to create node pod", error instanceof Error ? { cause: error } : undefined);
    }

    const env = await this.getCachedShellEnv();
    const { proxyCacheDirectoryPath } = this.dependencies;
    // `KUBECACHEDIR` is in the environment already, but the kubectl matched to
    // an older cluster may predate it.
    const cacheDirArgs = proxyCacheDirectoryPath === undefined ? [] : ["--cache-dir", proxyCacheDirectoryPath];
    const args = [...cacheDirArgs, "attach", "-q", "-i", "-t", "-n", "kube-system", this.podName];

    await this.openShellProcess(this.dependencies.kubeTools.kubectlPath, args, env);
  }

  protected async createNodeShellPod(coreApi: CoreV1Api) {
    const { cluster } = this;

    assert(cluster, "A node shell session always has a cluster");

    const { imagePullSecret, nodeShellImage } = cluster.preferences;

    const imagePullSecrets = imagePullSecret
      ? [
          {
            name: imagePullSecret,
          },
        ]
      : undefined;

    const nodeApi = this.dependencies.createKubeApi(NodeApi, {
      request: this.dependencies.createKubeJsonApiForCluster(cluster.id),
    });
    const node = await nodeApi.get({ name: this.nodeName });

    if (!node) {
      throw new Error(`No node with name=${this.nodeName} found`);
    }

    const nodeOs = node.getOperatingSystem();
    const nodeOsImage = node.getOperatingSystemImage();

    let image: string;
    let command: string[];
    let args: string[];
    let securityContext: any;

    switch (nodeOs) {
      default:
        this.dependencies.logger.warn(
          `[NODE-SHELL-SESSION]: could not determine node OS, falling back with assumption of linux`,
        );
      // fallthrough
      case "linux":
        image = nodeShellImage || initialNodeShellImage;
        command = ["nsenter"];

        if (nodeOsImage && nodeOsImage.startsWith("Bottlerocket OS")) {
          args = ["-t", "1", "-m", "-u", "-i", "-n", "-p", "--", "apiclient", "exec", "admin", "bash", "-l"];
        } else {
          args = ["-t", "1", "-m", "-u", "-i", "-n", "-p", "--", "bash", "-l"];
        }

        securityContext = {
          privileged: true,
        };
        break;
      case "windows":
        image = nodeShellImage || initialNodeShellWindowsImage;
        command = ["cmd.exe"];
        args = [
          "/c",
          "%CONTAINER_SANDBOX_MOUNT_POINT%\\Program Files\\PowerShell\\latest\\pwsh.exe",
          "-nol",
          "-wd",
          "C:\\",
        ];
        securityContext = {
          privileged: true,
          windowsOptions: {
            hostProcess: true,
            runAsUserName: "NT AUTHORITY\\SYSTEM",
          },
        };
        break;
    }

    // Closed while the node was looked up: `cleanup` has already run, and
    // found nothing to delete.
    if (this.signal.aborted) {
      return;
    }

    this.podCreation = coreApi.createNamespacedPod({
      namespace: "kube-system",
      body: {
        metadata: {
          name: this.podName,
          namespace: "kube-system",
        },
        spec: {
          nodeName: this.nodeName,
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 0,
          hostPID: true,
          hostIPC: true,
          hostNetwork: true,
          tolerations: [
            {
              operator: "Exists",
            },
          ],
          priorityClassName: "system-node-critical",
          containers: [
            {
              name: "shell",
              image,
              securityContext,
              command,
              args,
              stdin: true,
              stdinOnce: true,
              tty: true,
            },
          ],
          imagePullSecrets,
        },
      },
    });

    await this.podCreation;
  }

  /**
   * Settles exactly once: on the pod's phase, the end of the watch, the
   * timeout or the terminal's close, whichever comes first. Whatever settles it
   * stops the others, so neither the watch nor the timer outlives the wait.
   */
  protected waitForRunningPod(kc: KubeConfig): Promise<void> {
    this.dependencies.logger.debug(`[NODE-SHELL]: waiting for ${this.podName} to be running`);

    return new Promise((resolve, reject) => {
      let settled = false;
      let watchRequest: AbortController | undefined;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const settle = (): boolean => {
        if (settled) {
          return false;
        }

        settled = true;
        clearTimeout(timeout);
        this.signal.removeEventListener("abort", onClose);
        // Ends the watch with an error, which `settled` turns into a no-op.
        watchRequest?.abort();

        return true;
      };

      const onClose = () => {
        if (settle()) {
          reject(new Error(`the terminal closed while waiting for ${this.podName}`));
        }
      };

      if (this.signal.aborted) {
        onClose();

        return;
      }

      this.signal.addEventListener("abort", onClose, { once: true });

      new Watch(kc)
        .watch(
          `/api/v1/namespaces/kube-system/pods`,
          {},
          // callback is called for each received object.
          (type, { metadata: { name }, status }: Pod) => {
            if (name === this.podName) {
              switch (status?.phase) {
                case "Running":
                  if (settle()) {
                    resolve();
                  }
                  break;
                case "Failed":
                  if (settle()) {
                    reject(
                      `Failed to be created: ${(status as unknown as Record<string, string>).message || "unknown error"}`,
                    );
                  }
                  break;
              }
            }
          },
          // done callback is called if the watch terminates normally
          (err) => {
            if (settle()) {
              this.dependencies.logger.error(`[NODE-SHELL]: ${this.podName} was not created in time`);
              reject(err);
            }
          },
        )
        .then((req) => {
          watchRequest = req;

          // Settled before the request was handed over, so `settle` could not
          // stop it.
          if (settled) {
            return req.abort();
          }

          timeout = setTimeout(
            () => {
              if (settle()) {
                this.dependencies.logger.error(`[NODE-SHELL]: aborting wait for ${this.podName}, timing out`);
                reject("Pod creation timed out");
              }
            },
            2 * 60 * 1000,
          );
        })
        .catch((error) => {
          if (settle()) {
            this.dependencies.logger.error(`[NODE-SHELL]: waiting for ${this.podName} failed: ${String(error)}`);
            reject(error);
          }
        });
    });
  }
}
