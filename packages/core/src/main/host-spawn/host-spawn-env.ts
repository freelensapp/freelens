/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Environment variables of the Flatpak sandbox whose values must never reach a
 * process on the host: they are sandbox paths and metadata that either do not
 * exist on the host or would point a host process at the sandbox. `host-spawn`
 * merges the forwarded variables over the host's own environment, so
 * forwarding one of these would break the host process rather than help it.
 */
export const sandboxOnlyEnvVarNames: ReadonlySet<string> = new Set([
  // Sandbox `/app/bin` and the runtime's `/usr/bin` do not exist on the host.
  "PATH",
  // The sandbox home is `~/.var/app/<app-id>`, not the host user's home.
  "HOME",
  // Libraries and the loader configuration of the sandbox runtime.
  "LD_LIBRARY_PATH",
  "LD_PRELOAD",
  // Directories of the sandbox; the host process has its own.
  "TMPDIR",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_DIRS",
  "XDG_CONFIG_HOME",
  "XDG_DATA_DIRS",
  "XDG_DATA_HOME",
  "XDG_RUNTIME_DIR",
  "XDG_STATE_HOME",
  // Flatpak metadata of the sandbox itself.
  "FLATPAK_ID",
  "FLATPAK_SANDBOX_DIR",
]);

/**
 * The variables `host-spawn` passes by default, so that they stay forwarded
 * when an explicit `-env` list replaces the default: without them the host
 * process would lose its terminal type and working directory.
 */
const alwaysForwardedEnvVarNames: readonly string[] = ["TERM", "PWD"];

export type EnvVarRecord = Partial<Record<string, string | undefined>>;

/**
 * The names of the environment variables of `env` that `host-spawn` must
 * forward to the process it spawns on the host, as a comma-separated list for
 * its `-env` option.
 *
 * Every variable of `env` is forwarded except the sandbox-only ones of
 * {@link sandboxOnlyEnvVarNames}, so that variables the sandbox rendered for
 * a host process — a kubeconfig `exec` plugin's `env`, for example
 * `AWS_PROFILE` — survive the hop out of the sandbox. `TERM` and `PWD` are
 * always named, as they are by default, and the names are sorted so the
 * argument is stable.
 */
export const hostSpawnForwardedEnvVarNames = (env: EnvVarRecord): string[] => {
  const names = new Set(alwaysForwardedEnvVarNames);

  for (const [name, value] of Object.entries(env)) {
    if (value === undefined || sandboxOnlyEnvVarNames.has(name)) {
      continue;
    }

    names.add(name);
  }

  return [...names].sort();
};

/**
 * The arguments that tell `host-spawn` which of the environment variables of
 * its own process to forward to the host process it spawns: `-env` with the
 * comma-separated names, before any command arguments.
 */
export const hostSpawnEnvArgs = (env: EnvVarRecord): [string, string] => [
  "-env",
  hostSpawnForwardedEnvVarNames(env).join(","),
];
