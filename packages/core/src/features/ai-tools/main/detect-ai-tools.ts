/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getExecutableFor } from "../common/ai-tools";

import type { AiToolDetection, AiToolProvider, AiToolSettings } from "../common/ai-tools";

export interface DetectAiToolDependencies {
  findExecutable: (command: string) => Promise<string | undefined>;
  readVersion: (executable: string, args: string[]) => Promise<string | undefined>;
}

export const detectAiTool = async (
  provider: AiToolProvider,
  settings: AiToolSettings,
  { findExecutable, readVersion }: DetectAiToolDependencies,
): Promise<AiToolDetection> => {
  const executable = getExecutableFor(provider, settings);

  if (!executable) {
    return { id: provider.id, status: "not-configured", executable };
  }

  try {
    const resolvedPath = await findExecutable(executable);

    if (!resolvedPath) {
      return { id: provider.id, status: "not-installed", executable };
    }

    const version = provider.versionArguments ? await readVersion(resolvedPath, provider.versionArguments) : undefined;

    return { id: provider.id, status: "installed", executable, resolvedPath, ...(version ? { version } : {}) };
  } catch (error) {
    return {
      id: provider.id,
      status: "error",
      executable,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
