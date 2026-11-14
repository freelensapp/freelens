/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import activeKubernetesClusterInjectable from "../../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import styles from "./ai-assistant-top-bar-item.module.scss";
import { AiToolBadge } from "./ai-tool-badge";
import aiToolDetectionsInjectable from "./ai-tool-detections.injectable";
import aiToolProvidersInjectable from "./ai-tool-providers.injectable";
import navigateToAiToolsPreferencesInjectable from "./navigate-to-ai-tools-preferences.injectable";
import openAskAiInjectable from "./open-ask-ai.injectable";
import selectedAiToolInjectable from "./selected-ai-tool.injectable";

import type { IComputedValue } from "mobx";

import type { KubernetesCluster } from "../../../common/catalog-entities";
import type { UserPreferencesState } from "../../user-preferences/common/state.injectable";
import type { AiToolProvider } from "../common/ai-tools";
import type { AiToolDetections } from "./ai-tool-detections.injectable";
import type { OpenAskAi } from "./open-ask-ai.injectable";

interface Dependencies {
  state: UserPreferencesState;
  providers: AiToolProvider[];
  selected: IComputedValue<AiToolProvider | undefined>;
  detections: AiToolDetections;
  activeCluster: IComputedValue<KubernetesCluster | null>;
  openAskAi: OpenAskAi;
  openSettings: () => void;
}

const NonInjectedAiAssistantTopBarItem = observer(
  ({ state, providers, selected, detections, activeCluster, openAskAi, openSettings }: Dependencies) => {
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>();
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const provider = selected.get();
    const cluster = activeCluster.get();

    useEffect(() => {
      if (!menuPosition) return undefined;

      const close = (event: MouseEvent | KeyboardEvent) => {
        if (
          event instanceof KeyboardEvent
            ? event.key === "Escape"
            : !rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)
        ) {
          setMenuPosition(undefined);
        }
      };

      window.addEventListener("mousedown", close);
      window.addEventListener("keydown", close);

      return () => {
        window.removeEventListener("mousedown", close);
        window.removeEventListener("keydown", close);
      };
    }, [menuPosition]);

    const toggleMenu = () => {
      if (menuPosition) {
        setMenuPosition(undefined);

        return;
      }

      const rect = rootRef.current?.getBoundingClientRect();

      setMenuPosition({ top: (rect?.bottom ?? 40) + 4, right: Math.max(8, window.innerWidth - (rect?.right ?? 0)) });
      void detections.refresh();
    };

    const askAboutCluster = () => {
      setMenuPosition(undefined);

      if (!provider) {
        openSettings();

        return;
      }

      void openAskAi({ target: { type: "cluster" }, presetId: "cluster-health" });
    };

    return (
      <div className={styles.root} ref={rootRef} data-testid="ai-assistant-top-bar-item">
        <button
          type="button"
          className={styles.ask}
          onClick={askAboutCluster}
          title={
            provider
              ? cluster
                ? `Ask ${provider.name} about ${cluster.getName()}`
                : `Open a cluster to ask ${provider.name}`
              : "Choose an AI assistant"
          }
          data-testid="ai-assistant-ask"
        >
          {provider ? <AiToolBadge provider={provider} small /> : <span className={styles.sparkle}>✦</span>}
          {provider ? "Ask AI" : "Set up AI"}
        </button>
        <button
          type="button"
          className={styles.toggle}
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={Boolean(menuPosition)}
          aria-label="Choose AI assistant"
          data-testid="ai-assistant-menu-toggle"
        >
          ▾
        </button>
        {menuPosition && (
          <div className={styles.menu} style={menuPosition} role="menu" ref={menuRef}>
            <div className={styles.heading}>AI assistant</div>
            {providers.map((candidate) => {
              const status = detections.results.get(candidate.id)?.status;
              const isInstalled = status === "installed";

              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={candidate.id === provider?.id}
                  className={styles.item}
                  disabled={!isInstalled}
                  onClick={() => {
                    runInAction(() => (state.aiTool = candidate.id));
                    setMenuPosition(undefined);
                  }}
                  data-testid={`ai-assistant-choose-${candidate.id}`}
                >
                  <AiToolBadge provider={candidate} small />
                  {candidate.name}
                  <span className={styles.meta}>
                    {candidate.id === provider?.id ? (
                      <span className={styles.check}>✓</span>
                    ) : status === undefined ? (
                      "…"
                    ) : isInstalled ? (
                      ""
                    ) : (
                      "not installed"
                    )}
                  </span>
                </button>
              );
            })}
            <div className={styles.divider} />
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              disabled={!provider || !cluster}
              onClick={askAboutCluster}
            >
              Ask AI about {cluster ? cluster.getName() : "the open cluster"}
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => {
                setMenuPosition(undefined);
                openSettings();
              }}
            >
              AI tool settings…
            </button>
          </div>
        )}
      </div>
    );
  },
);

export const AiAssistantTopBarItem = withInjectables<Dependencies>(NonInjectedAiAssistantTopBarItem, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    providers: di.inject(aiToolProvidersInjectable),
    selected: di.inject(selectedAiToolInjectable),
    detections: di.inject(aiToolDetectionsInjectable),
    activeCluster: di.inject(activeKubernetesClusterInjectable),
    openAskAi: di.inject(openAskAiInjectable),
    openSettings: di.inject(navigateToAiToolsPreferencesInjectable),
  }),
});
