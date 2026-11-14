/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { aiToolDefinitions, detectAiToolsChannel } from "../common/ai-tools";

const findExecutable = async (command: string): Promise<string | undefined> => {
  const { PATH = "", PATHEXT = ".COM;.EXE;.BAT;.CMD" } = process.env;
  const directories = PATH.split(path.delimiter).filter(Boolean);
  const hasDirectory = command.includes("/") || command.includes("\\") || path.isAbsolute(command);
  const extensions = process.platform === "win32" && !path.extname(command) ? PATHEXT.split(";") : [""];
  const candidates = hasDirectory
    ? extensions.map((extension) => (process.platform === "win32" ? `${command}${extension}` : command))
    : directories.flatMap((directory) =>
        extensions.map((extension) =>
          path.join(directory, process.platform === "win32" ? `${command}${extension}` : command),
        ),
      );

  for (const candidate of candidates) {
    try {
      await access(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK);
      const file = await stat(candidate);

      if (file.isFile()) {
        return candidate;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== "ENOENT" && code !== "EACCES" && code !== "ENOTDIR") {
        throw error;
      }
    }
  }

  return undefined;
};

const detectAiToolsInjectable = getInjectable({
  id: "detect-ai-tools",

  instantiate: () =>
    getRequestChannelListenerInjectable({
      id: "detect-ai-tools",
      channel: detectAiToolsChannel,
      getHandler:
        () =>
        async ({ customCommand }) =>
          Promise.all(
            aiToolDefinitions.map(async (tool) => {
              const command = tool.id === "custom" ? customCommand.trim() : tool.command;
              const commandPath = command ? await findExecutable(command) : undefined;

              return {
                id: tool.id,
                name: tool.name,
                description: tool.description,
                command: command || tool.command,
                installUrl: tool.installUrl,
                commandPath,
              };
            }),
          ),
    }),
});

export default detectAiToolsInjectable;
