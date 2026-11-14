/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import sendCommandInjectable from "../../../renderer/components/dock/terminal/send-command.injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { detectAiToolsChannel } from "../common/ai-tools";
import { createAiToolCommand } from "./create-ai-tool-command";
import { resourceYamlForAi } from "./resource-yaml-for-ai";

import type { KubeObject } from "@freelensapp/kube-object";

export type AskAi = (object: KubeObject, clusterName?: string) => Promise<void>;

const askAiInjectable = getInjectable({
  id: "ask-ai",

  instantiate: (di): AskAi => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const logger = di.inject(loggerInjectionToken);
    const preferences = di.inject(userPreferencesStateInjectable);
    const sendCommand = di.inject(sendCommandInjectable);
    const isWindows = di.inject(isWindowsInjectable);

    return async (object, clusterName) => {
      const selectedTool = preferences.aiTool;

      if (!selectedTool) {
        showErrorNotification("Select an AI tool in Preferences > External Tools before asking AI.");

        return;
      }

      try {
        const tools = await requestFromChannel(detectAiToolsChannel, {
          customCommand: preferences.customAiToolCommand,
        });
        const tool = tools.find(({ id }) => id === selectedTool);

        if (!tool?.commandPath) {
          showErrorNotification(`${tool?.name ?? "The selected AI tool"} is not installed or could not be found.`);

          return;
        }

        const promptLimit = isWindows ? 8_000 : 24_000;
        const resource = resourceYamlForAi(object.kind, object.toPlainObject());
        const prompt = [
          "Review this Kubernetes resource. Explain its purpose, identify configuration or security risks, and suggest safe next steps. Do not apply changes.",
          `Cluster: ${clusterName || "unknown"}`,
          `Resource: ${object.kind} ${object.getNs() ? `${object.getNs()}/` : ""}${object.getName()}`,
          "",
          "Resource YAML:",
          "```yaml",
          resource.length > promptLimit ? `${resource.slice(0, promptLimit)}\n# Truncated by ProLens` : resource,
          "```",
        ].join("\n");

        const command = createAiToolCommand(selectedTool, tool.commandPath, prompt, isWindows);

        await sendCommand(command, { enter: true, redactCommandFromLogs: true });
      } catch (error) {
        logger.error("Failed to launch the selected AI tool", { error });
        showErrorNotification(`Failed to launch the selected AI tool: ${String(error)}`);
      }
    };
  },
});

export default askAiInjectable;
