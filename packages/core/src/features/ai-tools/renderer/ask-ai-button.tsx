/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import styles from "./ask-ai-button.module.scss";
import openAskAiInjectable from "./open-ask-ai.injectable";

import type { AskAiRequest } from "../common/ask-ai-request";
import type { OpenAskAi } from "./open-ask-ai.injectable";

export interface AskAiButtonProps {
  /** Built when clicked, so that it captures the state of that moment. */
  getRequest: () => AskAiRequest;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

interface Dependencies {
  openAskAi: OpenAskAi;
}

const NonInjectedAskAiButton = ({
  getRequest,
  label = "Ask AI",
  className,
  openAskAi,
  ...rest
}: AskAiButtonProps & Dependencies) => (
  <button
    type="button"
    className={className ? `${styles.button} ${className}` : styles.button}
    onClick={() => void openAskAi(getRequest())}
    data-testid={rest["data-testid"] ?? "ask-ai-button"}
  >
    <span className={styles.sparkle} aria-hidden="true">
      ✦
    </span>
    {label}
  </button>
);

export const AskAiButton = withInjectables<Dependencies, AskAiButtonProps>(NonInjectedAskAiButton, {
  getProps: (di, props) => ({
    ...props,
    openAskAi: di.inject(openAskAiInjectable),
  }),
});
