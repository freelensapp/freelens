import { Icon } from "@freelensapp/icon";
import React, { useState } from "react";
import styles from "./extension-icon.module.scss";

export interface ExtensionIconProps {
  disabled?: boolean;
  /**
   * The icon of a marketplace entry; without it, or when it fails to load,
   * the default icon.
   */
  src?: string;
}

export const ExtensionIcon: React.FC<ExtensionIconProps> = ({ disabled, src }) => {
  const [failedSrc, setFailedSrc] = useState<string>();
  const showImage = src !== undefined && src !== failedSrc;

  return (
    <div className={`${styles.icon} ${disabled ? styles.disabled : ""} ${showImage ? styles.withImage : ""}`}>
      {showImage ? (
        <img src={src} alt="" className={styles.image} onError={() => setFailedSrc(src)} />
      ) : (
        <Icon material="extension" />
      )}
    </div>
  );
};
