import React from "react";
import styles from "./extension-version-pill.module.scss";

export interface ExtensionVersionPillProps {
  version: string;
}

export const ExtensionVersionPill: React.FC<ExtensionVersionPillProps> = ({ version }) => (
  <span className={styles.pill}>v{version}</span>
);
