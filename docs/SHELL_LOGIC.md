# Shell Logic

There are multiple parts of how the shell logic works, and this doc is being created to capture that to help future improvements. This investigation was spawned through the Issues [#480](https://github.com/freelensapp/freelens/issues/480) and [#211](https://github.com/freelensapp/freelens/issues/211).

Each of the below sections, functionally determine what shell and behavior should happen, but the lack of consistency, means there may be different experience behaviors at startup and at runtime.

Current hunch is that this could be refactored, to have a single determination at runtime, stored in an importable location (no shell name is exported at Initialization, though other values are), while the Preferences logic allows for an override, this isn't respected by the Pod Shell Menu at runtime.

## Pre Refactor Layout

1. Initialization
2. Preferences
3. Pod Shell Menu

### Initialization

During initialization the logic is found at `packages/core/src/features/shell-sync/main/compute-unix-shell-environment.injectable.ts`, and has debugging so you can validate you're seeing the expected shell (should be the one pnpm start is ran in).

Current Core Code

```typescript
const computeUnixShellEnvironmentInjectable = getInjectable({
  id: "compute-unix-shell-environment",
  instantiate: (di): ComputeUnixShellEnvironment => {
    const powerShellName = /^pwsh(-preview)?$/;
    const cshLikeShellName = /^(t?csh)$/;
    const fishLikeShellName = /^fish$/;

    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const spawn = di.inject(spawnInjectable);
    const logger = di.inject(loggerInjectionToken);
    const randomUUID = di.inject(randomUUIDInjectable);
    const processExecPath = di.inject(processExecPathInjectable);
    const processEnv = di.inject(processEnvInjectable);

    const getShellSpecifics = (shellName: string) => {
      const mark = randomUUID().replace(/-/g, "");
      const regex = new RegExp(`${mark}(\\{.*\\})${mark}`);

      if (powerShellName.test(shellName)) {
        // Older versions of PowerShell removes double quotes sometimes so we use "double single quotes" which is how
        // you escape single quotes inside of a single quoted string.
        return {
          command: `Command '${processExecPath}' -p '\\"${mark}\\" + JSON.stringify(process.env) + \\"${mark}\\"'`,
          shellArgs: ["-Login"],
          regex,
        };
      }

      let command = `'${processExecPath}' -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;
      const shellArgs = ["-l"];

      if (fishLikeShellName.test(shellName)) {
        shellArgs.push("-c", command);
        command = "";
      } else if (!cshLikeShellName.test(shellName)) {
        // zsh (at least, maybe others) don't load RC files when in non-interactive mode, even when using -l (login) option
        shellArgs.push("-i");
        command = ` ${command}`; // This prevents the command from being added to the history
      } else {
        // Some shells don't support any other options when providing the -l (login) shell option
      }

      return { command, shellArgs, regex };
    };
```

### Preferences

`packages/core/src/common/vars/default-shell.injectable.ts`

```typescript
const defaultShellInjectable = getInjectable({
  id: "default-shell",

  instantiate: (di) => {
    const isFlatpakPackage = di.inject(isFlatpakPackageInjectable);
    const isLinux = di.inject(isLinuxInjectable);
    const isMac = di.inject(isMacInjectable);
    const isWindows = di.inject(isWindowsInjectable);

    if (isFlatpakPackage) {
      return "/app/bin/host-spawn";
    }

    if (process.env.SHELL) {
      return process.env.SHELL;
    }

    if (process.env.PTYSHELL) {
      return process.env.PTYSHELL;
    }

    if (isWindows) {
      return "powershell.exe";
    }

    if (isMac) {
      return "zsh";
    }

    if (isLinux) {
      return "bash";
    }

    return "System default shell";
  },

  causesSideEffects: true,
});

export default defaultShellInjectable;
```

### Pod Shell Menu

`freelens/packages/core/src/features/shell-sync/main/compute-unix-shell-environment.injectable.ts`

Extract of working but non-mutatable code

```typescript
const execShell = async (container: Container) =>  {
    const containerName = container.name;
    const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
    const commandParts = [
      kubectlPath,
      //"exec", // This is duplicated in theo os.platform command below, and believe it's behavior is functionally null on the unshift
      "-i",
      "-t",
      "-n",
      pod.getNs(),
      pod.getName(),
    ];
    // This adds the exec command for non-windows platforms as the first element in the array
    // we'd like this to also check if the shell is powershell as an && != check
    
    if (os.platform() !== "win32" && (!os.userInfo().shell?.toLowerCase().includes("powershell"))) {
      commandParts.unshift("exec");
    }
```

## Post Refactor Layout Proposal

1. Initialization - This should store the default system or current shell (during debugging) and it should be stored as a defaul state, and as the preference terminal state, if the user hasn't updated. This design would also let us add a button, to restore the shell path to the system default.
2. Pod-Shell-Menu - Logic refactored to check the shell current preference, and then figure out whether or not to prepend exec
3. Preference - this should ensure the value is exportable, similar to kubectl, if a user opens and sets the preference to a different value, otherwise the Initialization will do an initial write to the file.

**Note as this is being reverse engineered, there may be other locations where this logic should also be refactored.**
