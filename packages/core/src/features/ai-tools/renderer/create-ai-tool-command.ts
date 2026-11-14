/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AiToolId } from "../common/ai-tools";

const quotePosixArgument = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const quotePowerShellArgument = (value: string) => `'${value.replaceAll("'", "''")}'`;

const toPowerShellEncodedCommand = (script: string) => {
  const bytes = new Uint8Array(script.length * 2);

  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }

  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
};

export const createAiToolCommand = (toolId: AiToolId, executable: string, prompt: string, isWindows: boolean) => {
  const argumentsForTool = (() => {
    switch (toolId) {
      case "claude-code":
        return ["-p", prompt];
      case "copilot-cli":
        return ["-p", prompt];
      case "antigravity-cli":
        return ["--prompt", prompt];
      case "codex-cli":
        return ["exec", prompt];
      case "opencode":
        return ["run", prompt];
      case "custom":
        return [prompt];
    }
  })();

  if (!isWindows) {
    return [executable, ...argumentsForTool].map(quotePosixArgument).join(" ");
  }

  const script = [
    `$executable = ${quotePowerShellArgument(executable)}`,
    `$arguments = @(${argumentsForTool.map(quotePowerShellArgument).join(", ")})`,
    "& $executable @arguments",
    "exit $LASTEXITCODE",
  ].join("\n");

  return `powershell.exe -NoProfile -EncodedCommand ${toPowerShellEncodedCommand(script)}`;
};
