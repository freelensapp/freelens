/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { createAiToolCommand } from "./create-ai-tool-command";

describe("createAiToolCommand", () => {
  it("quotes the prompt as one POSIX shell argument", () => {
    const prompt = "Review this: '$(touch /tmp/not-run); echo done";

    const command = createAiToolCommand("claude-code", "/opt/claude", prompt, false);

    expect(command).toBe("'/opt/claude' '-p' 'Review this: '\\''$(touch /tmp/not-run); echo done'");
  });

  it("encodes PowerShell arguments so shell metacharacters stay data", () => {
    const prompt = "Review this: '$(Write-Output unsafe); &";

    const command = createAiToolCommand("codex-cli", "C:\\Tools\\codex.exe", prompt, true);
    const encodedScript = command.split(" ").at(-1)!;
    const script = Buffer.from(encodedScript, "base64").toString("utf16le");

    expect(command).toMatch(/^powershell\.exe -NoProfile -EncodedCommand [A-Za-z0-9+/=]+$/);
    expect(script).toContain("C:\\Tools\\codex.exe");
    expect(script).toContain("exec");
    expect(script).toContain(prompt.replaceAll("'", "''"));
  });
});
