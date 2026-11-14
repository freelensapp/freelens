/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { lookUpTerminalShell } from "../look-up-terminal-shell";
import type { Stats } from "node:fs";

import type { LookUpTerminalShellDependencies } from "../look-up-terminal-shell";

interface FakeFile {
  directory?: boolean;
  executable?: boolean;
}

function fakeFileSystem(files: Record<string, FakeFile>): Pick<LookUpTerminalShellDependencies, "stat" | "accessPath"> {
  return {
    stat: async (path) => {
      const file = files[path];

      if (!file) {
        throw Object.assign(new Error(`ENOENT: no such file or directory, stat '${path}'`), { code: "ENOENT" });
      }

      return { isFile: () => !file.directory, isDirectory: () => Boolean(file.directory) } as Stats;
    },
    accessPath: async (path) => Boolean(files[path]?.executable),
  };
}

describe("looking up the shell of the Terminal Shell Path setting", () => {
  describe("on Windows", () => {
    const dependencies: LookUpTerminalShellDependencies = {
      defaultShell: "powershell.exe",
      isWindows: true,
      // Windows spells it Path, and the lookup ignores the case of the names
      env: { Path: "C:\\Windows\\System32;C:\\Program Files\\PowerShell\\7", PATHEXT: ".COM;.EXE;.BAT;.CMD" },
      ...fakeFileSystem({
        "C:\\Windows\\System32\\wsl.exe": {},
        "C:\\Windows\\System32\\WindowsPowerShell": { directory: true },
        "C:\\Program Files\\PowerShell\\7\\pwsh.exe": {},
      }),
    };

    it("finds a shell given by name on the PATH, with the extensions of PATHEXT", async () => {
      expect(await lookUpTerminalShell("pwsh", dependencies)).toEqual({
        shell: "pwsh",
        path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      });
    });

    it("finds a shell given by its full path", async () => {
      expect(await lookUpTerminalShell("C:\\Windows\\System32\\wsl.exe", dependencies)).toEqual({
        shell: "C:\\Windows\\System32\\wsl.exe",
        path: "C:\\Windows\\System32\\wsl.exe",
      });
    });

    it("does not find a shell that no directory of the PATH has", async () => {
      expect(await lookUpTerminalShell("bash.exe", dependencies)).toEqual({ shell: "bash.exe" });
    });

    it("does not find a full path that is not a file", async () => {
      expect(await lookUpTerminalShell("C:\\Windows\\System32\\WindowsPowerShell", dependencies)).toEqual({
        shell: "C:\\Windows\\System32\\WindowsPowerShell",
      });
    });

    it("looks up the default shell when the setting is empty", async () => {
      expect(await lookUpTerminalShell("", dependencies)).toEqual({ shell: "powershell.exe" });
    });
  });

  describe("on macOS and Linux", () => {
    const dependencies: LookUpTerminalShellDependencies = {
      defaultShell: "/bin/zsh",
      isWindows: false,
      env: { PATH: "/usr/local/bin:/usr/bin:/bin" },
      ...fakeFileSystem({
        "/bin/zsh": { executable: true },
        "/usr/local/bin/fish": { executable: true },
        "/usr/bin/notes": {},
        "/usr/bin/nu": { directory: true, executable: true },
      }),
    };

    it("finds a shell given by name on the PATH", async () => {
      expect(await lookUpTerminalShell("fish", dependencies)).toEqual({ shell: "fish", path: "/usr/local/bin/fish" });
    });

    it("finds a shell given by its path", async () => {
      expect(await lookUpTerminalShell("/bin/zsh", dependencies)).toEqual({ shell: "/bin/zsh", path: "/bin/zsh" });
    });

    it("does not find a file that cannot be executed", async () => {
      expect(await lookUpTerminalShell("notes", dependencies)).toEqual({ shell: "notes" });
    });

    it("does not find a directory with the name of the shell", async () => {
      expect(await lookUpTerminalShell("nu", dependencies)).toEqual({ shell: "nu" });
    });

    it("does not find a shell that no directory of the PATH has", async () => {
      expect(await lookUpTerminalShell("elvish", dependencies)).toEqual({ shell: "elvish" });
    });

    it("looks up the default shell when the setting is empty", async () => {
      expect(await lookUpTerminalShell("", dependencies)).toEqual({ shell: "/bin/zsh", path: "/bin/zsh" });
    });
  });
});
