/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createAiToolCommand, resolveArguments, splitArguments } from "./command";

describe("splitArguments", () => {
  it("splits on whitespace and honours quotes and escapes", () => {
    expect(splitArguments(`--a  b 'c d' "e \\"f\\"" g\\ h ''`)).toEqual(["--a", "b", "c d", 'e "f"', "g h", ""]);
  });

  it("never expands anything", () => {
    expect(splitArguments("$(rm -rf /) `id` $HOME ~")).toEqual(["$(rm", "-rf", "/)", "`id`", "$HOME", "~"]);
  });

  it("rejects an unterminated quote", () => {
    expect(() => splitArguments("--model 'opus")).toThrow("Unterminated single quote");
  });
});

describe("resolveArguments", () => {
  it("places the prompt where the template says", () => {
    expect(resolveArguments("--permission-mode plan {prompt} --verbose")).toEqual([
      { type: "literal", value: "--permission-mode" },
      { type: "literal", value: "plan" },
      { type: "prompt" },
      { type: "literal", value: "--verbose" },
    ]);
  });

  it("appends the prompt when the template does not place it", () => {
    expect(resolveArguments("run")).toEqual([{ type: "literal", value: "run" }, { type: "prompt" }]);
  });
});

describe("createAiToolCommand", () => {
  it("quotes every part and reads the prompt from its file on POSIX shells", () => {
    expect(
      createAiToolCommand({
        executable: "/opt/my tools/claude",
        argumentTemplate: "--permission-mode plan {prompt}",
        promptFilePath: "/tmp/prolens-ai/it's.md",
        isWindows: false,
      }),
    ).toBe(`'/opt/my tools/claude' '--permission-mode' 'plan' "$(cat '/tmp/prolens-ai/it'\\''s.md')"`);
  });

  it.runIf(process.platform !== "win32")("passes a hostile prompt to the tool as one literal argument", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "prolens-command-test-"));
    const promptFile = path.join(directory, "prompt.md");
    const marker = path.join(directory, "pwned");
    const prompt = `Why? '$(touch ${marker})' "; touch ${marker}; \`touch ${marker}\`\nline two`;

    writeFileSync(promptFile, prompt);

    const command = createAiToolCommand({
      executable: process.execPath,
      argumentTemplate: `-e "process.stdout.write(JSON.stringify(process.argv.slice(1)))" {prompt}`,
      promptFilePath: promptFile,
      isWindows: false,
    });
    const output = execFileSync("/bin/sh", ["-c", command], { encoding: "utf-8" });

    expect(JSON.parse(output)).toEqual([prompt]);
    expect(() => execFileSync("test", ["-e", marker])).toThrow();
  });

  it("hands the AI session token to the tool in place of the terminal's, replacing the shell", () => {
    expect(
      createAiToolCommand({
        executable: "/bin/claude",
        argumentTemplate: "{prompt}",
        promptFilePath: "/tmp/p.md",
        tokenFilePath: "/tmp/s.token",
        isWindows: false,
      }),
    ).toBe(`exec env FREELENS_PROXY_TOKEN="$(cat '/tmp/s.token')" '/bin/claude' "$(cat '/tmp/p.md')"`);
  });

  it.runIf(process.platform !== "win32")("gives the tool the session token even when the shell has its own", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "prolens-command-test-"));
    const promptFile = path.join(directory, "prompt.md");
    const tokenFile = path.join(directory, "session.token");

    writeFileSync(promptFile, "p");
    writeFileSync(tokenFile, "session-token");

    const command = createAiToolCommand({
      executable: process.execPath,
      argumentTemplate: `-e "process.stdout.write(process.env.FREELENS_PROXY_TOKEN)" {prompt}`,
      promptFilePath: promptFile,
      tokenFilePath: tokenFile,
      isWindows: false,
    });

    expect(
      execFileSync("/bin/sh", ["-c", command], {
        encoding: "utf-8",
        env: { ...process.env, FREELENS_PROXY_TOKEN: "terminal-token" },
      }),
    ).toBe("session-token");
  });

  it("refuses an environment variable name that is not one", () => {
    expect(() =>
      createAiToolCommand({
        executable: "x",
        argumentTemplate: "",
        promptFilePath: "p",
        tokenFilePath: "t",
        tokenEnvVar: "A; rm -rf ~",
        isWindows: false,
      }),
    ).toThrow("Invalid environment variable name");
  });

  it("builds an encoded PowerShell script on Windows", () => {
    const command = createAiToolCommand({
      executable: "C:\\Tools\\codex.exe",
      argumentTemplate: "--sandbox read-only {prompt}",
      promptFilePath: "C:\\Temp\\o'brien.md",
      isWindows: true,
    });
    const encoded = command.split(" ").at(-1)!;
    const script = Buffer.from(encoded, "base64").toString("utf16le");

    expect(command).toMatch(/^powershell\.exe -NoProfile -EncodedCommand [A-Za-z0-9+/=]+$/);
    expect(script).toContain("Get-Content -Raw -Encoding UTF8 -LiteralPath 'C:\\Temp\\o''brien.md'");
    expect(script).toContain("$arguments = @('--sandbox', 'read-only', $prompt)");
    expect(script).toContain("$executable = 'C:\\Tools\\codex.exe'");
  });

  it("sets the session token for the tool's own PowerShell on Windows", () => {
    const command = createAiToolCommand({
      executable: "C:\\Tools\\codex.exe",
      argumentTemplate: "{prompt}",
      promptFilePath: "C:\\Temp\\p.md",
      tokenFilePath: "C:\\Temp\\s.token",
      isWindows: true,
    });
    const script = Buffer.from(command.split(" ").at(-1)!, "base64").toString("utf16le");

    expect(script.split("\n")[0]).toBe(
      "$env:FREELENS_PROXY_TOKEN = (Get-Content -Raw -LiteralPath 'C:\\Temp\\s.token').Trim()",
    );
  });
});
