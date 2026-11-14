/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import hostedClusterIdInjectable from "../../../renderer/cluster-frame-context/hosted-cluster-id.injectable";
import sendCommandInjectable from "../../../renderer/components/dock/terminal/send-command.injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { getArgumentsFor, prepareAiLaunchChannel, proxyTokenEnvVar } from "../common/ai-tools";
import { createAiToolCommand } from "../common/command";
import aiToolDetectionsInjectable from "./ai-tool-detections.injectable";

import type { AiToolProvider } from "../common/ai-tools";

export type LaunchAiTool = (provider: AiToolProvider, prompt: string) => Promise<void>;

/**
 * Starts `provider` in a new terminal tab of this cluster frame, with
 * `prompt` as its initial prompt. Throws with a message for the user when it
 * cannot.
 */
const launchAiToolInjectable = getInjectable({
  id: "launch-ai-tool",
  instantiate: (di): LaunchAiTool => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    const sendCommand = di.inject(sendCommandInjectable);
    const state = di.inject(userPreferencesStateInjectable);
    const detections = di.inject(aiToolDetectionsInjectable);
    const isWindows = di.inject(isWindowsInjectable);

    return async (provider, prompt) => {
      const [detection] = await detections.refresh([provider.id]);

      if (!detection || detection.status === "not-configured") {
        throw new Error(`${provider.name} has no executable configured. Set it in Preferences → External Tools.`);
      }

      if (detection.status !== "installed" || !detection.resolvedPath) {
        throw new Error(
          detection.error ??
            `${provider.name} ("${detection.executable}") was not found. Install it or set its path in Preferences → External Tools.`,
        );
      }

      const clusterId = di.inject(hostedClusterIdInjectable);

      if (!clusterId) {
        throw new Error("Open a cluster to ask AI about it.");
      }

      const prepared = await requestFromChannel(prepareAiLaunchChannel, {
        prompt,
        providerName: provider.name,
        clusterId,
      });

      if (!prepared.callWasSuccessful) {
        throw new Error(prepared.error);
      }

      const command = createAiToolCommand({
        executable: detection.resolvedPath,
        argumentTemplate: getArgumentsFor(provider, state.aiToolSettings),
        promptFilePath: prepared.response.promptFilePath,
        tokenFilePath: prepared.response.tokenFilePath,
        tokenEnvVar: proxyTokenEnvVar,
        isWindows,
      });

      await sendCommand(command, { enter: true, redactCommandFromLogs: true });
    };
  },
});

export default launchAiToolInjectable;
