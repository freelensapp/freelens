/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { detectAiTool } from "./detect-ai-tools";
import { findExecutable } from "./find-executable";

import type { AiToolProvider } from "../common/ai-tools";

const provider: AiToolProvider = {
  id: "fake",
  name: "Fake",
  vendor: "Test",
  description: "",
  iconText: "F",
  iconColor: "#000",
  defaultExecutable: "fake-ai",
  defaultArguments: "{prompt}",
  versionArguments: ["--version"],
  installSteps: [],
  orderNumber: 0,
};

describe("detectAiTool", () => {
  it("reports an installed tool with its path and version", async () => {
    const readVersion = vi.fn(async () => "fake-ai 1.2.3");

    await expect(
      detectAiTool(provider, {}, { findExecutable: async () => "/usr/bin/fake-ai", readVersion }),
    ).resolves.toEqual({
      id: "fake",
      status: "installed",
      executable: "fake-ai",
      resolvedPath: "/usr/bin/fake-ai",
      version: "fake-ai 1.2.3",
    });
    expect(readVersion).toHaveBeenCalledWith("/usr/bin/fake-ai", ["--version"]);
  });

  it("reports a missing tool", async () => {
    await expect(
      detectAiTool(provider, {}, { findExecutable: async () => undefined, readVersion: vi.fn() }),
    ).resolves.toEqual({ id: "fake", status: "not-installed", executable: "fake-ai" });
  });

  it("looks up the configured executable", async () => {
    const find = vi.fn(async () => undefined);

    await detectAiTool(
      provider,
      { fake: { executablePath: "/opt/ai" } },
      { findExecutable: find, readVersion: vi.fn() },
    );

    expect(find).toHaveBeenCalledWith("/opt/ai");
  });

  it("reports a custom tool without an executable as not configured", async () => {
    await expect(
      detectAiTool({ ...provider, defaultExecutable: "" }, {}, { findExecutable: vi.fn(), readVersion: vi.fn() }),
    ).resolves.toEqual({ id: "fake", status: "not-configured", executable: "" });
  });

  it("reports an error instead of throwing", async () => {
    await expect(
      detectAiTool(
        provider,
        {},
        {
          findExecutable: async () => {
            throw new Error("EPERM");
          },
          readVersion: vi.fn(),
        },
      ),
    ).resolves.toMatchObject({ status: "error", error: "EPERM" });
  });
});

describe.runIf(process.platform !== "win32")("findExecutable", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "prolens-find-executable-"));
  const binDirectory = path.join(root, "bin");
  const home = path.join(root, "home");
  const executable = path.join(binDirectory, "fake-ai");
  const notExecutable = path.join(binDirectory, "plain-file");

  mkdirSync(binDirectory, { recursive: true });
  mkdirSync(path.join(home, ".local", "bin"), { recursive: true });
  writeFileSync(executable, "#!/bin/sh\necho 1\n");
  chmodSync(executable, 0o755);
  writeFileSync(notExecutable, "");
  chmodSync(notExecutable, 0o644);
  writeFileSync(path.join(home, ".local", "bin", "home-ai"), "#!/bin/sh\n");
  chmodSync(path.join(home, ".local", "bin", "home-ai"), 0o755);

  const options = { platform: "linux" as const, env: { PATH: binDirectory }, homeDirectory: home };

  it("finds a command on PATH", async () => {
    await expect(findExecutable("fake-ai", options)).resolves.toBe(executable);
  });

  it("ignores files that are not executable", async () => {
    await expect(findExecutable("plain-file", options)).resolves.toBeUndefined();
  });

  it("finds a command in a well-known directory missing from PATH", async () => {
    await expect(findExecutable("home-ai", options)).resolves.toBe(path.join(home, ".local", "bin", "home-ai"));
  });

  it("accepts an absolute path and a home-relative one", async () => {
    await expect(findExecutable(executable, options)).resolves.toBe(executable);
    await expect(findExecutable("~/.local/bin/home-ai", options)).resolves.toBe(
      path.join(home, ".local", "bin", "home-ai"),
    );
  });

  it("returns undefined for an unknown command", async () => {
    await expect(findExecutable("definitely-not-installed-ai", options)).resolves.toBeUndefined();
  });
});
