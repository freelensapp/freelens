/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import getBasenameOfPathInjectable from "../../../common/path/get-basename.injectable";
import killProcessGroupInjectable from "../../../main/child-process/kill-process-group.injectable";
import spawnInjectable from "../../../main/child-process/spawn.injectable";
import randomUUIDInjectable from "../../../main/crypto/random-uuid.injectable";
import processEnvInjectable from "./env.injectable";
import processExecPathInjectable from "./execPath.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { EnvironmentVariables } from "./compute-shell-environment.injectable";

export interface UnixShellEnvOptions {
  signal: AbortSignal;
}

export type ComputeUnixShellEnvironment = (
  shell: string,
  opts: UnixShellEnvOptions,
) => AsyncResult<EnvironmentVariables, string>;

/**
 * @param src The object containing the current environment variables
 * @param overrides The environment variables that want to be overridden before passing the env to a child process
 * @returns The combination of environment variables and a function which resets an object of environment variables to the values the keys corresponded to in `src` (rather than `overrides`)
 */
const getResetProcessEnv = (
  src: Partial<Record<string, string>>,
  overrides: Partial<Record<string, string>>,
): {
  resetEnvPairs: (target: Partial<Record<string, string>>) => void;
  env: Partial<Record<string, string>>;
} => {
  const originals = object.entries(overrides).map(([name]) => [name, src[name]] as const);

  return {
    env: {
      ...src,
      ...overrides,
    },
    resetEnvPairs: (target) => {
      for (const [name, originalValue] of originals) {
        if (typeof originalValue === "string") {
          target[name] = originalValue;
        } else {
          delete target[name];
        }
      }
    },
  };
};

interface ShellSpecifics {
  shellArgs: string[];
  stdin: string;
  overrides: Partial<Record<string, string>>;
  parseOutput: (output: string) => Partial<Record<string, string>> | undefined;
}

// The shell is interactive and runs the user's rc files, whatever the command is
const shellOverrides = {
  ITERM_SHELL_INTEGRATION_INSTALLED: "1", // ITerm2 shell integration breaks output
  TERM: "screen-256color-bce", // required for fish
  VSCODE_SHELL_INTEGRATION: "1", // VS Code shell integration breaks output
};

/**
 * Parses the output of `env -0`: records separated by NUL, each split on its first `=`. Values may contain newlines
 * and `=`. A record without `=` is skipped.
 */
const parseNulSeparatedEnv = (output: string): Partial<Record<string, string>> => {
  const env: Partial<Record<string, string>> = {};

  for (const record of output.split("\0")) {
    const separator = record.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    env[record.slice(0, separator)] = record.slice(separator + 1);
  }

  return env;
};

const computeUnixShellEnvironmentInjectable = getInjectable({
  id: "compute-unix-shell-environment",
  instantiate: (di): ComputeUnixShellEnvironment => {
    const powerShellName = /^pwsh(-preview)?(\.exe)?$/i;
    const cshLikeShellName = /^(t?csh)(\.exe)?$/i;
    const fishLikeShellName = /^fish(\.exe)?$/i;

    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const spawn = di.inject(spawnInjectable);
    const killProcessGroup = di.inject(killProcessGroupInjectable);
    const logger = di.inject(loggerInjectionToken);
    const randomUUID = di.inject(randomUUIDInjectable);
    const processExecPath = di.inject(processExecPathInjectable);
    const processEnv = di.inject(processEnvInjectable);

    const getShellSpecifics = (shellName: string): ShellSpecifics => {
      const mark = randomUUID().replace(/-/g, "");

      if (powerShellName.test(shellName)) {
        const regex = new RegExp(`${mark}(\\{.*\\})${mark}`);

        // Older versions of PowerShell removes double quotes sometimes so we use "double single quotes" which is how
        // you escape single quotes inside of a single quoted string.
        return {
          shellArgs: ["-Login"],
          stdin: `Command '${processExecPath}' -e 'process.stdout.write(\\"${mark}\\" + JSON.stringify(process.env) + \\"${mark}\\")'`,
          overrides: {
            ...shellOverrides,
            ELECTRON_RUN_AS_NODE: "1",
            ELECTRON_NO_ATTACH_CONSOLE: "1",
          },
          parseOutput: (output) => {
            const matchedOutput = regex.exec(output)?.[1];

            return matchedOutput ? (JSON.parse(matchedOutput) as Partial<Record<string, string>>) : undefined;
          },
        };
      }

      // The marker is hex only, so it needs no quoting, and the command is valid in sh, bash, zsh, ksh, dash, fish
      // and csh alike. `env` is called by its absolute path because `-i` enables aliases, so a bare `env` could be an
      // alias or a function from the user's rc files.
      const command = `printf '%s' ${mark}; /usr/bin/env -0; printf '%s' ${mark}`;
      const regex = new RegExp(`${mark}([\\s\\S]*)${mark}`);
      const parseOutput = (output: string) => {
        const matchedOutput = regex.exec(output)?.[1];

        return matchedOutput ? parseNulSeparatedEnv(matchedOutput) : undefined;
      };

      if (fishLikeShellName.test(shellName)) {
        return { shellArgs: ["-l", "-c", command], stdin: "", overrides: shellOverrides, parseOutput };
      }

      if (cshLikeShellName.test(shellName)) {
        // Some shells don't support any other options when providing the -l (login) shell option
        return { shellArgs: ["-l"], stdin: command, overrides: shellOverrides, parseOutput };
      }

      // zsh (at least, maybe others) don't load RC files when in non-interactive mode, even when using -l (login) option.
      // A command passed with -c is not added to the history.
      return { shellArgs: ["-l", "-i", "-c", command], stdin: "", overrides: shellOverrides, parseOutput };
    };

    return async (shellPath, opts) => {
      const shellName = getBasenameOfPath(shellPath);
      const { shellArgs, stdin, overrides, parseOutput } = getShellSpecifics(shellName);
      const { resetEnvPairs, env } = getResetProcessEnv(processEnv, overrides);

      logger.info(`[UNIX-SHELL-ENV]: running against ${shellPath}`, { shellArgs, stdin });

      return new Promise((resolve) => {
        // `detached: true` runs the shell in a new session (`setsid()`), which does two things:
        //
        // - The shell has no controlling terminal. When Freelens is started from a terminal, an
        //   interactive shell would otherwise take over that terminal, putting itself in its
        //   foreground and reading commands from it instead of from stdin, so it would hang.
        // - The shell and everything its rc files start share a process group of their own,
        //   which the abort handler below kills as a whole.
        //
        // The abort is not passed to `spawn` as `signal`: Node would send `SIGTERM` to the
        // shell alone, which an interactive shell ignores.
        const shellProcess = spawn(shellPath, shellArgs, {
          detached: true,
          env,
        });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        const getErrorContext = (other: object = {}) => {
          const context = {
            ...other,
            stdout: Buffer.concat(stdout).toString("utf-8"),
            stderr: Buffer.concat(stderr).toString("utf-8"),
          };

          return JSON.stringify(context, null, 4);
        };

        shellProcess.stdout.on("data", (b) => stdout.push(b));
        shellProcess.stderr.on("data", (b) => stderr.push(b));

        const onAbort = () => {
          resolve({
            callWasSuccessful: false,
            error: `timeout: ${getErrorContext()}`,
          });

          if (shellProcess.pid === undefined) {
            return;
          }

          try {
            killProcessGroup(shellProcess.pid);
          } catch (error) {
            logger.warn(`[UNIX-SHELL-ENV]: failed to kill the process group of ${shellPath}`, { error });
          }
        };
        const stopWatchingAbort = () => opts.signal.removeEventListener("abort", onAbort);

        shellProcess.on("error", (error) => {
          stopWatchingAbort();
          resolve({
            callWasSuccessful: false,
            error: `Failed to spawn ${shellPath}: ${getErrorContext({ error: String(error) })}`,
          });
        });
        shellProcess.on("close", (code, signal) => {
          stopWatchingAbort();

          if (code || signal) {
            return resolve({
              callWasSuccessful: false,
              error: `Shell did not exit successfully: ${getErrorContext({ code, signal })}`,
            });
          }

          try {
            const rawOutput = Buffer.concat(stdout).toString("utf-8");

            logger.silly(`[UNIX-SHELL-ENV]: got the following output`, { rawOutput });

            const resolvedEnv = parseOutput(rawOutput);

            if (!resolvedEnv) {
              return resolve({
                callWasSuccessful: false,
                error: "Something has blocked the shell from producing the environment variables",
              });
            }

            resetEnvPairs(resolvedEnv);
            resolve({
              callWasSuccessful: true,
              response: resolvedEnv,
            });
          } catch (err) {
            resolve({
              callWasSuccessful: false,
              error: String(err),
            });
          }
        });

        if (opts.signal.aborted) {
          onAbort();

          return;
        }

        opts.signal.addEventListener("abort", onAbort, { once: true });
        shellProcess.stdin.end(stdin);
      });
    };
  },
  causesSideEffects: true,
});

export default computeUnixShellEnvironmentInjectable;
