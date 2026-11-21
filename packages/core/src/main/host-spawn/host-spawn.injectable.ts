/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import process from "node:process";
import { getInjectable } from "@ogre-tools/injectable";
import getBasenameOfPathInjectable from "../../common/path/get-basename.injectable";
import flatpakHostSpawnPathInjectable from "../../common/vars/flatpak-host-spawn-path.injectable";
import { hostSpawnEnvArgs } from "./host-spawn-env";

import type { EnvVarRecord } from "./host-spawn-env";

/**
 * The file, arguments and environment to spawn a process with, after the
 * `host-spawn` specifics have been applied.
 */
export interface SpawnOptionsForFile {
  readonly args: string[];
  readonly env: EnvVarRecord;
}

export interface HostSpawn {
  /**
   * Whether `file` is the Flatpak `host-spawn` helper, which runs what it is
   * given on the host instead of in the sandbox.
   */
  isHostSpawn: (file: string) => boolean;
  /**
   * The arguments and environment to spawn `file` with.
   *
   * For any other file than `host-spawn` they are the ones given, unchanged.
   * For `host-spawn` the arguments get its `-env` option prepended, naming
   * every variable of the environment that is not sandbox-only, so that the
   * variables are forwarded to the host process instead of being dropped at
   * the sandbox boundary (`host-spawn` passes only `TERM` and `PWD` unless
   * told otherwise), and the environment is `process.env` under `env`, so
   * that `host-spawn` can read the value of every forwarded name from its own
   * environment — which is exactly the `env` of the spawn options.
   */
  spawnOptionsFor: (file: string, args: readonly string[], env: EnvVarRecord) => SpawnOptionsForFile;
}

const hostSpawnInjectable = getInjectable({
  id: "host-spawn",

  instantiate: (di): HostSpawn => {
    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const flatpakHostSpawnPath = di.inject(flatpakHostSpawnPathInjectable);
    const hostSpawnBasename = getBasenameOfPath(flatpakHostSpawnPath);

    const isHostSpawn = (file: string): boolean =>
      file === flatpakHostSpawnPath || getBasenameOfPath(file) === hostSpawnBasename;

    const spawnOptionsFor: HostSpawn["spawnOptionsFor"] = (file, args, env) => {
      if (!isHostSpawn(file)) {
        return { args: [...args], env: { ...env } };
      }

      // Read at call time, not at instantiation: the environment of the
      // process can change between the two. `process.env` first, so that a
      // variable `env` sets wins: the computed environment overrides Freelens'
      // own, and `host-spawn` reads the values of the forwarded names from
      // this very environment.
      const mergedEnv = { ...process.env, ...env };

      return {
        args: [...hostSpawnEnvArgs(mergedEnv), ...args],
        env: mergedEnv,
      };
    };

    return { isHostSpawn, spawnOptionsFor };
  },
});

export default hostSpawnInjectable;
