/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { chmod, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import getClusterByIdInjectable from "../../cluster/storage/common/get-by-id.injectable";
import { prepareAiLaunchChannel } from "../common/ai-tools";
import aiSessionsInjectable from "./ai-sessions.injectable";

/** Prompt and token files older than this are deleted on the next launch. */
const maxFileAge = 60 * 60 * 1000;
const maxPromptLength = 200_000;

export const aiLaunchDirectory = () => path.join(os.tmpdir(), `prolens-ai-${os.userInfo().username}`);

const removeStaleFiles = async (directory: string) => {
  const now = Date.now();

  for (const entry of await readdir(directory)) {
    const file = path.join(directory, entry);

    try {
      if (now - (await stat(file)).mtimeMs > maxFileAge) {
        await rm(file, { force: true });
      }
    } catch {
      // Another ProLens window may have removed it first.
    }
  }
};

const prepareAiLaunchListenerInjectable = getRequestChannelListenerInjectable({
  id: "prepare-ai-launch-listener",
  channel: prepareAiLaunchChannel,
  getHandler: (di) => {
    const logger = di.inject(prefixedLoggerInjectable, "AI-TOOLS");
    const sessions = di.inject(aiSessionsInjectable);
    const getClusterById = di.inject(getClusterByIdInjectable);

    return async ({ prompt, providerName, clusterId }) => {
      if (typeof prompt !== "string" || !prompt.trim()) {
        return { callWasSuccessful: false, error: "The prompt is empty" };
      }

      if (prompt.length > maxPromptLength) {
        return { callWasSuccessful: false, error: "The prompt is too long" };
      }

      if (!getClusterById(clusterId)) {
        return { callWasSuccessful: false, error: "Unknown cluster" };
      }

      try {
        const directory = aiLaunchDirectory();

        await mkdir(directory, { recursive: true, mode: 0o700 });
        await chmod(directory, 0o700).catch(() => undefined);
        await removeStaleFiles(directory).catch(() => undefined);

        const session = sessions.issue({ providerName: String(providerName).slice(0, 64), clusterId });
        const promptFilePath = path.join(directory, `${session.id}.md`);
        const tokenFilePath = path.join(directory, `${session.id}.token`);

        await writeFile(promptFilePath, prompt, { encoding: "utf-8", mode: 0o600 });
        await writeFile(tokenFilePath, session.token, { encoding: "utf-8", mode: 0o600 });

        logger.info(`issued AI session ${session.id} for ${session.providerName} on cluster ${clusterId}`);

        return { callWasSuccessful: true, response: { promptFilePath, tokenFilePath, sessionId: session.id } };
      } catch (error) {
        // Never log the prompt itself: it carries cluster details.
        logger.error("Failed to prepare the AI launch", { error: String(error) });

        return { callWasSuccessful: false, error: `Could not prepare the launch: ${String(error)}` };
      }
    };
  },
});

export default prepareAiLaunchListenerInjectable;
