/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export const promptPlaceholder = "{prompt}";

/**
 * Splits an argument template into arguments the way a POSIX shell would for
 * plain words and quotes: whitespace separates, single quotes are literal,
 * double quotes allow `\"` and `\\`, and a backslash outside quotes escapes the
 * next character. No expansion of any kind happens.
 */
export const splitArguments = (template: string): string[] => {
  const args: string[] = [];
  let current = "";
  let inArgument = false;
  let quote: "'" | '"' | undefined;

  for (let index = 0; index < template.length; index += 1) {
    const char = template[index];

    if (quote === "'") {
      if (char === "'") {
        quote = undefined;
      } else {
        current += char;
      }
    } else if (quote === '"') {
      if (char === '"') {
        quote = undefined;
      } else if (char === "\\" && (template[index + 1] === '"' || template[index + 1] === "\\")) {
        current += template[index + 1];
        index += 1;
      } else {
        current += char;
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      inArgument = true;
    } else if (char === "\\" && index + 1 < template.length) {
      current += template[index + 1];
      index += 1;
      inArgument = true;
    } else if (/\s/.test(char)) {
      if (inArgument) {
        args.push(current);
        current = "";
        inArgument = false;
      }
    } else {
      current += char;
      inArgument = true;
    }
  }

  if (quote) {
    throw new Error(`Unterminated ${quote === "'" ? "single" : "double"} quote in arguments`);
  }

  if (inArgument) {
    args.push(current);
  }

  return args;
};

export type AiArgument = { type: "literal"; value: string } | { type: "prompt" };

/**
 * Resolves an argument template to arguments, marking where the prompt goes.
 * The prompt is appended when the template does not place it.
 */
export const resolveArguments = (template: string): AiArgument[] => {
  const args = splitArguments(template).map(
    (value): AiArgument => (value === promptPlaceholder ? { type: "prompt" } : { type: "literal", value }),
  );

  return args.some((arg) => arg.type === "prompt") ? args : [...args, { type: "prompt" }];
};

export const quotePosixArgument = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const quotePowerShellArgument = (value: string) => `'${value.replaceAll("'", "''")}'`;

/**
 * PowerShell's `-EncodedCommand` takes base64 of UTF-16LE.
 */
export const toPowerShellEncodedCommand = (script: string) => {
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

  return globalThis.btoa(binary);
};

export interface CreateAiToolCommandArgs {
  executable: string;
  argumentTemplate: string;
  /** File the prompt was written to; the shell reads it at run time. */
  promptFilePath: string;
  /**
   * File holding the AI session token. The assistant gets it as the ProLens
   * proxy token in place of the terminal's own, so that its kubectl goes
   * through the AI session gate.
   */
  tokenFilePath?: string;
  /** Name of the environment variable the proxy token is read from. */
  tokenEnvVar?: string;
  isWindows: boolean;
}

/**
 * The command line typed into the terminal. Every part is quoted so that the
 * shell treats it as data; the prompt is read from its file by command
 * substitution inside double quotes, which the shell does not expand further.
 *
 * With a session token, a POSIX shell is replaced by the assistant (`exec`),
 * so the shell that holds the terminal's own token is not left behind as the
 * assistant's parent.
 */
export const createAiToolCommand = ({
  executable,
  argumentTemplate,
  promptFilePath,
  tokenFilePath,
  tokenEnvVar = "FREELENS_PROXY_TOKEN",
  isWindows,
}: CreateAiToolCommandArgs) => {
  const args = resolveArguments(argumentTemplate);

  if (!/^[A-Z_][A-Z0-9_]*$/.test(tokenEnvVar)) {
    throw new Error(`Invalid environment variable name: ${tokenEnvVar}`);
  }

  if (!isWindows) {
    const promptArgument = `"$(cat ${quotePosixArgument(promptFilePath)})"`;
    const command = [
      quotePosixArgument(executable),
      ...args.map((arg) => (arg.type === "prompt" ? promptArgument : quotePosixArgument(arg.value))),
    ].join(" ");

    return tokenFilePath ? `exec env ${tokenEnvVar}="$(cat ${quotePosixArgument(tokenFilePath)})" ${command}` : command;
  }

  const script = [
    ...(tokenFilePath
      ? [`$env:${tokenEnvVar} = (Get-Content -Raw -LiteralPath ${quotePowerShellArgument(tokenFilePath)}).Trim()`]
      : []),
    `$prompt = Get-Content -Raw -Encoding UTF8 -LiteralPath ${quotePowerShellArgument(promptFilePath)}`,
    `$executable = ${quotePowerShellArgument(executable)}`,
    `$arguments = @(${args.map((arg) => (arg.type === "prompt" ? "$prompt" : quotePowerShellArgument(arg.value))).join(", ")})`,
    "& $executable @arguments",
    "exit $LASTEXITCODE",
  ].join("\n");

  return `powershell.exe -NoProfile -EncodedCommand ${toPowerShellEncodedCommand(script)}`;
};
