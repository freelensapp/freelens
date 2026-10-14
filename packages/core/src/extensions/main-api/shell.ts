/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import kubeToolsForExtensionsInjectable from "../../main/kube-tools/kube-tools-for-extensions.injectable";
import { getDiForExtensionApi } from "../extension-api-di";

import type { ClusterId } from "../common-api/cluster-types";

/**
 * The progress of a kubectl download.
 */
export interface KubectlDownloadProgress {
  /** The bytes received so far. */
  transferred: number;
  /** The size of the download, when the server sent one. */
  total?: number;
}

/**
 * Callbacks reporting what a function that may download kubectl is doing, the
 * same ones the cluster terminal shows its startup status from. The host shows
 * nothing of its own for an extension's call: where the progress goes is the
 * extension's choice.
 */
export interface KubectlDownloadOptions {
  /**
   * A phase that is about to begin and may take a while: waiting for another
   * Freelens process, downloading, or verifying the download. The message
   * names the kubectl version.
   */
  onPhase?: (message: string) => void;
  /** The download progress, called as the bytes arrive. */
  onDownloadProgress?: (progress: KubectlDownloadProgress) => void;
  /**
   * A problem preparing the version-matched kubectl that the call goes on
   * from, with what it goes on with: the bundled kubectl, or, for
   * {@link getEnvironment} when the bundled kubectl is not usable, whichever
   * kubectl is on `PATH`. A problem the call does not go on from rejects it
   * instead and is not reported here.
   */
  onProblem?: (message: string) => void;
}

const kubeTools = () => getDiForExtensionApi().inject(kubeToolsForExtensionsInjectable);

/**
 * The kubectl Freelens runs in a terminal opened outside any cluster: the
 * user's "Path to kubectl binary" preference when "Download kubectl binaries
 * matching the Kubernetes cluster version" is off, else the kubectl bundled
 * with Freelens. An absolute path, to run kubectl by.
 */
export function getKubectlPath(): Promise<string>;
/**
 * The kubectl Freelens runs in the terminal of a cluster: the user's "Path to
 * kubectl binary" preference when "Download kubectl binaries matching the
 * Kubernetes cluster version" is off, else the kubectl matched to the
 * cluster's version, downloaded when it is missing, else the bundled one. An
 * absolute path, to run kubectl by.
 *
 * Rejects when there is no cluster with the id, when the cluster is not
 * connected, and when the bundled kubectl is not usable, so that Freelens has
 * no kubectl of its own to run.
 *
 * @param clusterId the id of a connected cluster
 * @param options callbacks reporting the download of the version-matched kubectl
 * @example
 * ```typescript
 * import { execFile } from "node:child_process";
 * import { Main } from "@freelensapp/extensions";
 *
 * const kubectl = await Main.Shell.getKubectlPath(clusterId);
 * const env = await Main.Shell.getEnvironment(clusterId);
 *
 * execFile(kubectl, ["get", "pods", "--output", "json"], { env }, (error, stdout) => {
 *   // ...
 * });
 * ```
 */
export function getKubectlPath(clusterId: ClusterId, options?: KubectlDownloadOptions): Promise<string>;
export async function getKubectlPath(clusterId?: ClusterId, options?: KubectlDownloadOptions): Promise<string> {
  return kubeTools().getKubectlPath(clusterId, options);
}

/**
 * The helm Freelens runs in a terminal opened outside any cluster: the user's
 * "Path to helm binary" preference, else the helm bundled with Freelens. An
 * absolute path.
 */
export function getHelmPath(): Promise<string>;
/**
 * The helm Freelens runs in the terminal of a cluster. helm does not depend on
 * the cluster's version, so this is the same binary as without a cluster.
 *
 * Rejects when there is no cluster with the id and when the cluster is not
 * connected.
 *
 * @param clusterId the id of a connected cluster
 */
export function getHelmPath(clusterId: ClusterId): Promise<string>;
export async function getHelmPath(clusterId?: ClusterId): Promise<string> {
  return kubeTools().getHelmPath(clusterId);
}

/**
 * The environment of a terminal opened outside any cluster, to pass as `env`
 * to a spawned process: the user's shell environment, with the directory of
 * the binaries bundled with Freelens appended to `PATH`, so that a kubectl or
 * helm the user installed keeps winning. `KUBECONFIG` is the user's own.
 *
 * `PATH` gets only Freelens' own directories, never one derived from a
 * preference: run kubectl and helm by the paths {@link getKubectlPath} and
 * {@link getHelmPath} return, not by name. It is under the key `PATH` and no
 * other spelling of it, on Windows too, where the host's own environment
 * spells it `Path`.
 */
export function getEnvironment(): Promise<Record<string, string>>;
/**
 * The environment of the terminal of a cluster, to pass as `env` to a spawned
 * process: the user's shell environment, with the directory of the kubectl
 * matched to the cluster's version first on `PATH` when that is the kubectl the
 * cluster runs, the directory of the bundled binaries last, `KUBECONFIG` and
 * `KUBECACHEDIR` that reach the cluster through Freelens, the cluster's proxy
 * setting as `HTTPS_PROXY`, and `NO_PROXY` with the local addresses added.
 * kubectl is downloaded when it is missing, as for {@link getKubectlPath}.
 *
 * `PATH` gets only Freelens' own directories, never one derived from a
 * preference: run kubectl and helm by the paths {@link getKubectlPath} and
 * {@link getHelmPath} return, not by name. It is under the key `PATH` and no
 * other spelling of it, on Windows too, where the host's own environment
 * spells it `Path`.
 *
 * Only reaching the cluster through Freelens is promised, not the server
 * address `KUBECONFIG` names or the content of the file. The files exist while
 * the cluster is connected: a disconnect removes them, and the environment
 * stops working; call again after reconnecting. A mobx `reaction` on
 * `Main.Catalog.getClusterById(clusterId)?.status` tells when either happens.
 *
 * Rejects when there is no cluster with the id and when the cluster is not
 * connected.
 *
 * @param clusterId the id of a connected cluster
 * @param options callbacks reporting the download of the version-matched kubectl
 */
export function getEnvironment(clusterId: ClusterId, options?: KubectlDownloadOptions): Promise<Record<string, string>>;
export async function getEnvironment(
  clusterId?: ClusterId,
  options?: KubectlDownloadOptions,
): Promise<Record<string, string>> {
  return kubeTools().getEnvironment(clusterId, options);
}
