/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "../../../renderer/components/dialog";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { defaultPresetFor, describeTarget, presetsFor } from "../common/ask-ai-request";
import { AiToolBadge } from "./ai-tool-badge";
import aiToolDetectionsInjectable from "./ai-tool-detections.injectable";
import aiToolProvidersInjectable from "./ai-tool-providers.injectable";
import styles from "./ask-ai-dialog.module.scss";
import askAiDialogStateInjectable from "./ask-ai-dialog-state.injectable";
import buildAskAiPromptInjectable, { availableContextSources } from "./build-ask-ai-prompt.injectable";
import { aiContextSourceInjectionToken } from "./context-source";
import launchAiToolInjectable from "./launch-ai-tool.injectable";

import type { IObservableValue } from "mobx";

import type { UserPreferencesState } from "../../user-preferences/common/state.injectable";
import type { AiToolProvider } from "../common/ai-tools";
import type { AskAiRequest } from "../common/ask-ai-request";
import type { AiToolDetections } from "./ai-tool-detections.injectable";
import type { BuildAskAiPrompt } from "./build-ask-ai-prompt.injectable";
import type { AiContextSource } from "./context-source";
import type { LaunchAiTool } from "./launch-ai-tool.injectable";

interface Dependencies {
  dialogState: IObservableValue<AskAiRequest | undefined>;
  providers: AiToolProvider[];
  detections: AiToolDetections;
  sources: AiContextSource[];
  state: UserPreferencesState;
  buildPrompt: BuildAskAiPrompt;
  launch: LaunchAiTool;
}

interface ContentProps extends Dependencies {
  request: AskAiRequest;
  close: () => void;
}

const AskAiDialogContent = observer(
  ({ request, close, providers, detections, sources, state, buildPrompt, launch }: ContentProps) => {
    const { target } = request;
    const presets = useMemo(() => presetsFor(target), [target]);
    const initialPreset = defaultPresetFor(target, request.presetId);
    const available = useMemo(() => availableContextSources(sources, target), [sources, target]);
    const [presetId, setPresetId] = useState<string | undefined>(initialPreset?.id);
    const [question, setQuestion] = useState(initialPreset?.question(target) ?? "");
    const [sourceIds, setSourceIds] = useState(() =>
      available.filter((source) => source.isEnabledByDefaultFor(target)).map((source) => source.id),
    );
    const [providerId, setProviderId] = useState(state.aiTool);
    const [preview, setPreview] = useState<string>();
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const abort = useRef<AbortController>(undefined);

    useEffect(() => {
      void detections.refresh();

      return () => abort.current?.abort();
    }, []);

    const installed = providers.filter((provider) => detections.results.get(provider.id)?.status === "installed");
    const provider =
      providers.find((candidate) => candidate.id === providerId && installed.includes(candidate)) ?? installed[0];

    const collect = async () => {
      abort.current?.abort();
      abort.current = new AbortController();

      return buildPrompt({ target, question, sourceIds, signal: abort.current.signal });
    };

    const run = async (action: "preview" | "launch") => {
      setError(undefined);

      if (!question.trim()) {
        setError("Write a question first.");

        return;
      }

      setBusy(true);

      try {
        const prompt = await collect();

        if (action === "preview") {
          setPreview(prompt);
        } else if (provider) {
          await launch(provider, prompt);
          close();
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setBusy(false);
      }
    };

    const toggleSource = (id: string, enabled: boolean) => {
      setPreview(undefined);
      setSourceIds((ids) => (enabled ? [...ids, id] : ids.filter((existing) => existing !== id)));
    };

    return (
      <div className={styles.dialog} data-testid="ask-ai-dialog">
        <div className={styles.header}>
          {provider && <AiToolBadge provider={provider} />}
          <div>
            <h2>Ask AI</h2>
            <div className={styles.subtitle}>About {describeTarget(target)}</div>
          </div>
        </div>

        <div className={styles.body}>
          <div>
            <span className={styles.label}>Assistant</span>
            <div className={styles.chips}>
              {providers.map((candidate) => {
                const status = detections.results.get(candidate.id)?.status;

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={styles.chip}
                    aria-pressed={provider?.id === candidate.id}
                    disabled={status !== "installed"}
                    title={status === "installed" ? candidate.description : `${candidate.name} is not installed`}
                    onClick={() => setProviderId(candidate.id)}
                    data-testid={`ask-ai-provider-${candidate.id}`}
                  >
                    <AiToolBadge provider={candidate} small />
                    {candidate.name}
                  </button>
                );
              })}
            </div>
            {!detections.isRefreshing && !installed.length && (
              <p className={styles.error}>
                No AI assistant was found. Install one, or configure its path in Preferences → External Tools.
              </p>
            )}
          </div>

          {presets.length > 0 && (
            <div>
              <span className={styles.label}>Suggested questions</span>
              <div className={styles.chips}>
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={styles.chip}
                    aria-pressed={presetId === preset.id}
                    onClick={() => {
                      setPresetId(preset.id);
                      setQuestion(preset.question(target));
                      setPreview(undefined);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={styles.label} htmlFor="ask-ai-question">
              Question
            </label>
            <textarea
              id="ask-ai-question"
              className={styles.question}
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setPresetId(undefined);
                setPreview(undefined);
              }}
              data-testid="ask-ai-question"
            />
          </div>

          {available.length > 0 && (
            <div>
              <span className={styles.label}>Context to include</span>
              <div className={styles.sources}>
                {available.map((source) => (
                  <label key={source.id} className={styles.source}>
                    <input
                      type="checkbox"
                      checked={sourceIds.includes(source.id)}
                      onChange={(event) => toggleSource(source.id, event.target.checked)}
                      data-testid={`ask-ai-source-${source.id}`}
                    />
                    <span>
                      {source.label}
                      <small>{source.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {provider && (
            <div className={provider.readOnlyMode ? styles.notice : `${styles.notice} ${styles.warning}`}>
              <span>
                {provider.name} opens in a new terminal tab of this cluster.{" "}
                {provider.readOnlyMode ??
                  "This assistant has no read-only mode ProLens can set; it is instructed to ask before changing anything, but its own settings decide what it runs."}
              </span>
            </div>
          )}

          {preview !== undefined && (
            <div>
              <span className={styles.label}>Prompt preview (exactly what is sent)</span>
              <pre className={styles.preview} data-testid="ask-ai-preview">
                {preview}
              </pre>
            </div>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <Button plain label="Preview prompt" disabled={busy} onClick={() => void run("preview")} />
          <span className={styles.spacer} />
          <Button plain label="Cancel" onClick={close} />
          <Button
            primary
            waiting={busy}
            disabled={busy || !provider}
            label={provider ? `Ask ${provider.name}` : "Ask AI"}
            onClick={() => void run("launch")}
            data-testid="ask-ai-launch"
          />
        </div>
      </div>
    );
  },
);

const NonInjectedAskAiDialog = observer((dependencies: Dependencies) => {
  const request = dependencies.dialogState.get();
  const close = () => dependencies.dialogState.set(undefined);

  return (
    <Dialog isOpen={Boolean(request)} close={close} className="AskAiDialog">
      {request && (
        <AskAiDialogContent
          key={JSON.stringify(request.target).slice(0, 200)}
          {...dependencies}
          request={request}
          close={close}
        />
      )}
    </Dialog>
  );
});

export const AskAiDialog = withInjectables<Dependencies>(NonInjectedAskAiDialog, {
  getProps: (di) => ({
    dialogState: di.inject(askAiDialogStateInjectable),
    providers: di.inject(aiToolProvidersInjectable),
    detections: di.inject(aiToolDetectionsInjectable),
    sources: di.injectMany(aiContextSourceInjectionToken),
    state: di.inject(userPreferencesStateInjectable),
    buildPrompt: di.inject(buildAskAiPromptInjectable),
    launch: di.inject(launchAiToolInjectable),
  }),
});
