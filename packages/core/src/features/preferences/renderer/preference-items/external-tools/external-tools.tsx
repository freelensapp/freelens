/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { showErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import openLinkInBrowserInjectable from "../../../../../common/utils/open-link-in-browser.injectable";
import platformInjectable from "../../../../../common/vars/platform.injectable";
import { SubTitle } from "../../../../../renderer/components/layout/sub-title";
import { customAiToolId, getArgumentsFor, getExecutableFor } from "../../../../ai-tools/common/ai-tools";
import { splitArguments } from "../../../../ai-tools/common/command";
import { AiToolBadge } from "../../../../ai-tools/renderer/ai-tool-badge";
import aiToolDetectionsInjectable from "../../../../ai-tools/renderer/ai-tool-detections.injectable";
import aiToolProvidersInjectable from "../../../../ai-tools/renderer/ai-tool-providers.injectable";
import userPreferencesStateInjectable from "../../../../user-preferences/common/state.injectable";
import styles from "./external-tools.module.scss";

import type { ShowNotification } from "@freelensapp/notifications";

import type { OpenLinkInBrowser } from "../../../../../common/utils/open-link-in-browser.injectable";
import type {
  AiToolDetection,
  AiToolPlatform,
  AiToolProvider,
  AiToolSetting,
} from "../../../../ai-tools/common/ai-tools";
import type { AiToolDetections } from "../../../../ai-tools/renderer/ai-tool-detections.injectable";
import type { UserPreferencesState } from "../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  providers: AiToolProvider[];
  detections: AiToolDetections;
  platform: string;
  openLinkInBrowser: OpenLinkInBrowser;
  showErrorNotification: ShowNotification;
  showSuccessNotification: ShowNotification;
}

const statusLabel = (detection: AiToolDetection | undefined, isRefreshing: boolean) => {
  if (!detection) {
    return { text: isRefreshing ? "Checking…" : "Unknown", className: styles.missing };
  }

  switch (detection.status) {
    case "installed":
      return { text: "Installed", className: styles.installed };
    case "not-configured":
      return { text: "Not configured", className: styles.missing };
    case "error":
      return { text: "Error", className: styles.failed };
    default:
      return { text: "Not installed", className: styles.missing };
  }
};

const argumentsError = (template: string) => {
  try {
    splitArguments(template);

    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
};

const NonInjectedExternalTools = observer(
  ({
    state,
    providers,
    detections,
    platform,
    openLinkInBrowser,
    showErrorNotification,
    showSuccessNotification,
  }: Dependencies) => {
    const [expanded, setExpanded] = useState<string>();

    useEffect(() => {
      void detections.refresh();
    }, []);

    const updateSetting = (id: string, update: Partial<AiToolSetting>) =>
      runInAction(() => {
        const next = { ...state.aiToolSettings[id], ...update };

        state.aiToolSettings = { ...state.aiToolSettings, [id]: next };
      });

    const resetSetting = (id: string) =>
      runInAction(() => {
        const { [id]: _removed, ...rest } = state.aiToolSettings;

        state.aiToolSettings = rest;
        void detections.refresh([id]);
      });

    const copy = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showSuccessNotification("Copied to clipboard", { timeout: 2_000 });
      } catch (error) {
        showErrorNotification(`Could not copy: ${String(error)}`);
      }
    };

    const openDocs = async (url: string) => {
      try {
        await openLinkInBrowser(url);
      } catch (error) {
        showErrorNotification(`Could not open ${url}: ${String(error)}`);
      }
    };

    const builtIn = providers.filter((provider) => provider.id !== customAiToolId);
    const detected = builtIn.filter((provider) => detections.results.get(provider.id)?.status === "installed").length;

    return (
      <section id="ai-tools">
        <SubTitle title="AI Tools" />
        <p className={styles.intro}>
          Choose the AI assistant that “Ask AI” starts. ProLens runs your locally installed command-line tool in the
          cluster’s terminal; the tool signs in and bills through its own account. Context is only sent when you ask,
          and you can preview it first.
        </p>

        <div className={styles.toolbar}>
          <span data-testid="ai-tools-summary">
            {detections.isRefreshing
              ? "Checking this system…"
              : `${detected} of ${builtIn.length} detected on this system`}
          </span>
          <Button
            plain
            label="Refresh"
            disabled={detections.isRefreshing}
            onClick={() => void detections.refresh()}
            data-testid="ai-tools-refresh"
          />
          {detections.lastError && <span className={styles.failed}>{detections.lastError}</span>}
        </div>

        <div className={styles.list} role="radiogroup" aria-label="Default AI assistant">
          {providers.map((provider) => {
            const detection = detections.results.get(provider.id);
            const status = statusLabel(detection, detections.isRefreshing);
            const installed = detection?.status === "installed";
            const selected = state.aiTool === provider.id;
            const isExpanded = expanded === provider.id;
            const setting = state.aiToolSettings[provider.id];
            const argumentTemplate = getArgumentsFor(provider, state.aiToolSettings);
            const templateError = argumentsError(argumentTemplate);
            const steps = provider.installSteps.filter(
              (step) => !step.platforms || step.platforms.includes(platform as AiToolPlatform),
            );

            return (
              <div
                key={provider.id}
                className={selected ? `${styles.tool} ${styles.selected}` : styles.tool}
                data-testid={`ai-tool-${provider.id}`}
              >
                <div className={styles.row}>
                  <input
                    type="radio"
                    className={styles.radio}
                    name="default-ai-tool"
                    checked={selected}
                    disabled={!installed}
                    onChange={() => runInAction(() => (state.aiTool = provider.id))}
                    aria-label={`Use ${provider.name} as default AI assistant`}
                    data-testid={`select-ai-tool-${provider.id}`}
                  />
                  <AiToolBadge provider={provider} />
                  <div className={styles.info}>
                    <div className={styles.name}>
                      {provider.name}
                      <span className={styles.vendor}>{provider.vendor}</span>
                    </div>
                    <div className={styles.description}>{provider.description}</div>
                    {detection?.resolvedPath && (
                      <div className={styles.path} title={detection.resolvedPath}>
                        {detection.resolvedPath}
                        {detection.version ? ` · ${detection.version}` : ""}
                      </div>
                    )}
                    {detection?.status === "not-installed" && (
                      <div className={styles.path}>“{detection.executable}” was not found</div>
                    )}
                    {detection?.error && <div className={styles.path}>{detection.error}</div>}
                  </div>
                  <span
                    className={`${styles.status} ${status.className}`}
                    data-testid={`ai-tool-status-${provider.id}`}
                  >
                    {status.text}
                  </span>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => setExpanded(isExpanded ? undefined : provider.id)}
                    aria-expanded={isExpanded}
                    data-testid={`configure-ai-tool-${provider.id}`}
                  >
                    {isExpanded
                      ? "Done"
                      : installed
                        ? "Configure"
                        : provider.id === customAiToolId
                          ? "Set up"
                          : "Install"}
                  </button>
                </div>

                {isExpanded && (
                  <div className={styles.details}>
                    <div className={styles.field}>
                      <label htmlFor={`ai-tool-path-${provider.id}`}>Executable</label>
                      <input
                        id={`ai-tool-path-${provider.id}`}
                        value={setting?.executablePath ?? ""}
                        placeholder={provider.defaultExecutable || "e.g. /usr/local/bin/my-ai or my-ai"}
                        onChange={(event) => updateSetting(provider.id, { executablePath: event.target.value })}
                        onBlur={() => void detections.refresh([provider.id])}
                        spellCheck={false}
                        data-testid={`ai-tool-path-input-${provider.id}`}
                      />
                      <small>
                        A command on your PATH or an absolute path.{" "}
                        {provider.defaultExecutable && `Default: ${provider.defaultExecutable}. `}
                        Resolved now: {getExecutableFor(provider, state.aiToolSettings) || "—"}
                      </small>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`ai-tool-args-${provider.id}`}>Arguments</label>
                      <input
                        id={`ai-tool-args-${provider.id}`}
                        value={argumentTemplate}
                        onChange={(event) => updateSetting(provider.id, { arguments: event.target.value })}
                        spellCheck={false}
                        data-testid={`ai-tool-args-input-${provider.id}`}
                      />
                      <small>
                        {templateError ??
                          "{prompt} is replaced by the prompt as a single argument; without it the prompt is appended."}
                        {provider.readOnlyMode && ` ${provider.readOnlyMode}`}
                      </small>
                    </div>
                    {steps.length > 0 && (
                      <div className={styles.field}>
                        <label>Install</label>
                        <div className={styles.steps}>
                          {steps.map((step) => (
                            <div key={step.command} className={styles.step}>
                              <span>{step.label}</span>
                              <code>{step.command}</code>
                              <button
                                type="button"
                                className={styles.linkButton}
                                onClick={() => void copy(step.command)}
                              >
                                Copy
                              </button>
                            </div>
                          ))}
                        </div>
                        <small>Run it in a terminal, then press Refresh.</small>
                      </div>
                    )}
                    <div className={styles.toolbar}>
                      {provider.installUrl && (
                        <Button plain label="Documentation" onClick={() => void openDocs(provider.installUrl!)} />
                      )}
                      {setting && <Button plain label="Reset to defaults" onClick={() => resetSetting(provider.id)} />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className={styles.footnote}>
          Ask AI never changes your cluster by itself. Each assistant starts in its most restrictive mode ProLens can
          set, is told to stay read-only, and must ask you before it runs a command that changes anything. Review your
          AI provider’s data handling terms before sending details of production systems.
        </p>
      </section>
    );
  },
);

export const ExternalTools = withInjectables<Dependencies>(NonInjectedExternalTools, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    providers: di.inject(aiToolProvidersInjectable),
    detections: di.inject(aiToolDetectionsInjectable),
    platform: di.inject(platformInjectable),
    openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
    showErrorNotification: di.inject(showErrorNotificationInjectable),
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
  }),
});
