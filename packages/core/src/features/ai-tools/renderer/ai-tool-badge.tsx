/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./ai-tool-badge.module.scss";

import type { AiToolProvider } from "../common/ai-tools";

export interface AiToolBadgeProps {
  provider: Pick<AiToolProvider, "iconText" | "iconColor" | "name">;
  small?: boolean;
}

export const AiToolBadge = ({ provider, small }: AiToolBadgeProps) => (
  <span
    className={small ? `${styles.badge} ${styles.small}` : styles.badge}
    style={{ background: provider.iconColor }}
    aria-hidden="true"
    title={provider.name}
  >
    {provider.iconText}
  </span>
);
