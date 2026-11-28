import { Icon } from "@freelensapp/icon";
import React from "react";
import styles from "./extension-status-badge.module.scss";

export type ExtensionStatusBadgeVariant = "official" | "community";

export interface ExtensionStatusBadgeProps {
  /** An extension that is not in the marketplace has no tier. */
  variant: ExtensionStatusBadgeVariant | undefined;
}

export const ExtensionStatusBadge: React.FC<ExtensionStatusBadgeProps> = ({ variant }) => {
  if (variant !== "official") return null;
  return (
    <Icon
      svg="logo-lens"
      small
      className={styles.officialIcon}
      tooltip="Official: an extension of the Freelens organization"
      data-testid="extension-tier-official"
    />
  );
};
