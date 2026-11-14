/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useCallback, useEffect, useState } from "react";
import openLinkInBrowserInjectable from "../../../../../common/utils/open-link-in-browser.injectable";
import { Input } from "../../../../../renderer/components/input";
import { SubTitle } from "../../../../../renderer/components/layout/sub-title";
import { detectAiToolsChannel } from "../../../../ai-tools/common/ai-tools";
import userPreferencesStateInjectable from "../../../../user-preferences/common/state.injectable";

import type { RequestFromChannel } from "@freelensapp/messaging";
import type { ShowNotification } from "@freelensapp/notifications";

import type { OpenLinkInBrowser } from "../../../../../common/utils/open-link-in-browser.injectable";
import type { DetectedAiTool } from "../../../../ai-tools/common/ai-tools";
import type { UserPreferencesState } from "../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  requestFromChannel: RequestFromChannel;
  openLinkInBrowser: OpenLinkInBrowser;
  showErrorNotification: ShowNotification;
}

const NonInjectedExternalTools = observer(
  ({ state, requestFromChannel, openLinkInBrowser, showErrorNotification }: Dependencies) => {
    const [tools, setTools] = useState<DetectedAiTool[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refresh = useCallback(async () => {
      setIsRefreshing(true);

      try {
        const detectedTools = await requestFromChannel(detectAiToolsChannel, {
          customCommand: state.customAiToolCommand,
        });

        setTools(detectedTools);
      } catch (error) {
        showErrorNotification(`Failed to detect AI tools: ${String(error)}`);
      } finally {
        setIsRefreshing(false);
      }
    }, [requestFromChannel, showErrorNotification, state.customAiToolCommand]);

    const openInstallInstructions = async (url: string) => {
      try {
        await openLinkInBrowser(url);
      } catch (error) {
        showErrorNotification(`Failed to open installation instructions: ${String(error)}`);
      }
    };

    useEffect(() => {
      void refresh();
    }, [refresh]);

    const detectedCount = tools.filter((tool) => tool.id !== "custom" && tool.commandPath).length;

    return (
      <section>
        <SubTitle title="AI Tool" />
        <p className="mb-4">
          Select the command ProLens launches for “Ask AI”. ProLens uses your local CLI installation and its own
          authentication; your AI provider may require an account or API key.
        </p>
        <div className="mb-4 flex items-center gap-2">
          <span>{isRefreshing ? "Checking this system…" : `${detectedCount} of 5 detected on this system`}</span>
          <Button plain label="Refresh" disabled={isRefreshing} onClick={() => void refresh()} />
        </div>
        <div>
          {tools.map((tool) => {
            const installed = Boolean(tool.commandPath);

            return (
              <div key={tool.id} className="flex items-center gap-3 py-3">
                <input
                  type="radio"
                  name="ai-tool"
                  value={tool.id}
                  checked={state.aiTool === tool.id}
                  disabled={!installed}
                  onChange={() => (state.aiTool = tool.id)}
                  aria-label={`Select ${tool.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{tool.name}</div>
                  <div className="text-sm">{tool.description}</div>
                  {installed ? (
                    <div className="text-sm">Installed: {tool.commandPath}</div>
                  ) : tool.id === "custom" ? (
                    <div className="text-sm">Configure a command to use this option.</div>
                  ) : (
                    <div className="text-sm">Command “{tool.command}” was not found in PATH.</div>
                  )}
                  {tool.id === "custom" && (
                    <div className="mt-2">
                      <Input
                        theme="round-black"
                        placeholder="Command or executable path"
                        value={state.customAiToolCommand}
                        onChange={(value) => (state.customAiToolCommand = value)}
                        onBlur={() => void refresh()}
                        aria-label="Custom AI tool command"
                      />
                      <small className="hint">The resource prompt is passed as the command’s final argument.</small>
                    </div>
                  )}
                </div>
                {installed ? (
                  <span>Installed</span>
                ) : tool.installUrl ? (
                  <Button
                    plain
                    label="Install"
                    onClick={() => void openInstallInstructions(tool.installUrl)}
                    data-testid={`install-ai-tool-${tool.id}`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-4">
          When you use “Ask AI”, the selected CLI receives the resource details. Review your provider’s data handling
          terms before sending sensitive information.
        </p>
      </section>
    );
  },
);

export const ExternalTools = withInjectables<Dependencies>(NonInjectedExternalTools, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    requestFromChannel: di.inject(requestFromChannelInjectionToken),
    openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
    showErrorNotification: di.inject(showErrorNotificationInjectable),
  }),
});
