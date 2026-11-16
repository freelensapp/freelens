/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { freelensProxyTokenEnvVar } from "../freelens-proxy/freelens-proxy-token";
import { clearKubeconfigEnvVars } from "../utils/clear-kube-env-vars";

import type { EnvironmentVariables } from "../../features/shell-sync/main/compute-shell-environment.injectable";

/**
 * The kubectl and helm Freelens runs, and the directories of Freelens' own
 * binaries it puts on `PATH`. This is the one place they are computed: the
 * terminals, the shell init scripts and the extension API all read them from
 * here.
 *
 * The paths and `PATH` are independent. A path is what runs its tool, and may
 * be one a preference names, used as it is; `PATH` only ever gets Freelens' own
 * directories, never one derived from a preference, for whatever runs a tool
 * by name.
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
   * Directories put in front of the user's own `PATH`: for a cluster, the
   * directory of the kubectl matched to its version once it is in place, so
   * that it wins over any other. Empty otherwise.
   */
  readonly pathPrefix: readonly string[];
  /**
   * Directories appended after the user's own `PATH`: the bundled binaries
   * directory, the fallback for a machine that has neither kubectl nor helm,
   * with and without a cluster.
   */
  readonly pathSuffix: readonly string[];
}

/** What a process run against a cluster through Freelens needs. */
export interface KubeToolsClusterAccess {
  /** The proxy kubeconfig, exported as `KUBECONFIG`. */
  readonly kubeconfigPath: string;
  /** The cache directory of {@link kubeconfigPath}, exported as `KUBECACHEDIR`. */
  readonly cacheDirectoryPath: string;
  /**
   * The freelens-proxy token, exported as `FREELENS_PROXY_TOKEN`. The
   * `credential` plugin of the proxy kubeconfig reads it, so a tool reaches the
   * cluster through the proxy. Only here, where the kubeconfig is the proxy's.
   */
  readonly token: string;
}

export interface ComposeKubeToolsEnvironmentArgs {
  /** The user's shell environment. It is copied, never modified. */
  readonly baseEnvironment: EnvironmentVariables;
  readonly tools: KubeTools;
  /** Set for a cluster, absent without one. */
  readonly clusterAccess?: KubeToolsClusterAccess;
  /**
   * The proxy preference of the context, exported as `HTTPS_PROXY` in place of
   * the user's own when set: the cluster's for a cluster, the application's
   * without one.
   */
  readonly httpsProxy?: string;
  readonly isWindows: boolean;
}

/**
 * Puts `prefix` in front of the `PATH` of `env` and `suffix` after it, in place.
 *
 * Windows spells the variable `Path` and reads its name case-insensitively,
 * but a copy of `process.env` is a plain object: `env.PATH` would read
 * nothing, and a second key would only shadow the first. So the variable
 * ends up under exactly one key, `PATH`, on every platform.
 */
export const surroundPath = (
  env: Partial<Record<string, string>>,
  prefix: readonly string[],
  suffix: readonly string[],
  isWindows: boolean,
): void => {
  const pathKeys = isWindows ? Object.keys(env).filter((key) => key.toUpperCase() === "PATH") : ["PATH"];
  const userPath = env[pathKeys.find((key) => key === "PATH") ?? pathKeys[0] ?? "PATH"];

  for (const key of pathKeys) {
    delete env[key];
  }

  env.PATH = [...prefix, userPath, ...suffix]
    .filter((entry) => entry !== undefined && entry !== "")
    .join(isWindows ? ";" : ":");
};

/**
 * The environment Freelens runs kubectl and helm with, the terminal's included
 * before it adds what only a terminal needs.
 *
 * `PATH` gets the tools' prefix in front of the user's own and their suffix
 * after it, under the key `PATH` and no other spelling of it. For a cluster, `KUBECONFIG` replaces every kubeconfig variable of
 * the user's, because kubectl reads other spellings of it before `KUBECONFIG`.
 * Without a cluster, the user's own kubeconfig is the point, so it is left
 * alone.
 */
export const composeKubeToolsEnvironment = ({
  baseEnvironment,
  tools,
  clusterAccess,
  httpsProxy,
  isWindows,
}: ComposeKubeToolsEnvironmentArgs): EnvironmentVariables => {
  const copiedEnvironment: EnvironmentVariables = { ...baseEnvironment };
  const env = clusterAccess === undefined ? copiedEnvironment : clearKubeconfigEnvVars(copiedEnvironment);

  surroundPath(env, tools.pathPrefix, tools.pathSuffix, isWindows);

  delete env.DEBUG; // don't pass DEBUG into shells

  if (clusterAccess !== undefined) {
    env.KUBECONFIG = clusterAccess.kubeconfigPath;
    env.KUBECACHEDIR = clusterAccess.cacheDirectoryPath;
    env[freelensProxyTokenEnvVar] = clusterAccess.token;
  }

  if (httpsProxy) {
    env.HTTPS_PROXY = httpsProxy;
  }

  env.NO_PROXY = ["localhost", "127.0.0.1", env.NO_PROXY].filter(Boolean).join();

  return env;
};
