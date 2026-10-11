/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clearKubeconfigEnvVars } from "../utils/clear-kube-env-vars";

import type { EnvironmentVariables } from "../../features/shell-sync/main/compute-shell-environment.injectable";

/**
 * The kubectl and helm Freelens runs, and the directories that make them
 * resolve by name. This is the one place they are computed: the terminals, the
 * shell init scripts and the extension API all read them from here, so the
 * path of a binary and the directory put on `PATH` for it cannot disagree.
 */
export interface KubeTools {
  /**
   * The kubectl to run. An absolute path, except for a cluster whose bundled
   * kubectl is not usable, where it is the bare binary name and the lookup is
   * left to `PATH`.
   */
  readonly kubectlPath: string;
  /** The helm to run, an absolute path. */
  readonly helmPath: string;
  /**
   * Directories put in front of the user's own `PATH`. Only a cluster has any:
   * it must run the kubectl matched to its version.
   */
  readonly pathPrefix: readonly string[];
  /**
   * Directories appended after the user's own `PATH`, so that anything the
   * user already has installed keeps winning. Only without a cluster.
   */
  readonly pathSuffix: readonly string[];
}

/**
 * Whether a kubectl path is the bare binary name, to be looked up on `PATH`,
 * rather than a path.
 */
export const isBareBinaryName = (binaryPath: string) => !/[\\/]/.test(binaryPath);

/**
 * The directories of the given paths followed by the extra directories, in
 * order, without a repeated or an empty entry: POSIX reads an empty `PATH`
 * entry as the current directory. A bare binary name has no directory.
 */
export const directoriesForPath = (
  getDirnameOfPath: (path: string) => string,
  binaryPaths: readonly string[],
  extraDirectories: readonly string[],
): string[] => {
  const directories = [
    ...binaryPaths.filter((binaryPath) => !isBareBinaryName(binaryPath)).map(getDirnameOfPath),
    ...extraDirectories,
  ];

  return [...new Set(directories.filter((directory) => directory !== ""))];
};

/** What a process run against a cluster through Freelens needs. */
export interface KubeToolsClusterAccess {
  /** The proxy kubeconfig, exported as `KUBECONFIG`. */
  readonly kubeconfigPath: string;
  /** The cache directory of {@link kubeconfigPath}, exported as `KUBECACHEDIR`. */
  readonly cacheDirectoryPath: string;
  /** The cluster's proxy preference, exported as `HTTPS_PROXY` when set. */
  readonly httpsProxy?: string;
}

export interface ComposeKubeToolsEnvironmentArgs {
  /** The user's shell environment. It is copied, never modified. */
  readonly baseEnvironment: EnvironmentVariables;
  readonly tools: KubeTools;
  /** Set for a cluster, absent without one. */
  readonly clusterAccess?: KubeToolsClusterAccess;
  readonly isWindows: boolean;
}

/**
 * The environment Freelens runs kubectl and helm with, the terminal's included
 * before it adds what only a terminal needs.
 *
 * For a cluster, the tools go first on `PATH`, and `KUBECONFIG` replaces every
 * kubeconfig variable of the user's, because kubectl reads other spellings of
 * it before `KUBECONFIG`. Without a cluster, the user's own kubeconfig is the
 * point, so it is left alone, and the tools are only appended to `PATH`.
 */
export const composeKubeToolsEnvironment = ({
  baseEnvironment,
  tools,
  clusterAccess,
  isWindows,
}: ComposeKubeToolsEnvironmentArgs): EnvironmentVariables => {
  const copiedEnvironment: EnvironmentVariables = { ...baseEnvironment };
  const env = clusterAccess === undefined ? copiedEnvironment : clearKubeconfigEnvVars(copiedEnvironment);
  // Windows spells the variable `Path`, and a copy of `process.env` is no
  // longer case-insensitive, so a second `PATH` would only shadow it.
  const pathKey = isWindows ? (Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "PATH") : "PATH";

  env[pathKey] = [...tools.pathPrefix, env[pathKey], ...tools.pathSuffix]
    .filter((entry) => entry !== undefined && entry !== "")
    .join(isWindows ? ";" : ":");

  delete env.DEBUG; // don't pass DEBUG into shells

  if (clusterAccess !== undefined) {
    env.KUBECONFIG = clusterAccess.kubeconfigPath;
    env.KUBECACHEDIR = clusterAccess.cacheDirectoryPath;

    if (clusterAccess.httpsProxy) {
      env.HTTPS_PROXY = clusterAccess.httpsProxy;
    }
  }

  env.NO_PROXY = ["localhost", "127.0.0.1", env.NO_PROXY].filter(Boolean).join();

  return env;
};
