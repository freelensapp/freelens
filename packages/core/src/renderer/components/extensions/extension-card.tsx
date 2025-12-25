/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import React from "react";
import styles from "./extension-card.module.scss";
import { MenuActions, MenuItem } from "../menu";

type BaseExtensionCardProps = {
  id: string;
  name: string;
  description: string;
  version: string;
};

type InstalledExtensionCardProps = BaseExtensionCardProps & {
  variant: "installed";
  isEnabled?: boolean;
  isCompatible?: boolean;
  isUninstalling?: boolean;
  onUninstall: () => void;
  onToggle: () => void;
};

type MarketplaceExtensionCardProps = BaseExtensionCardProps & {
  variant: "marketplace";
  onInstall: () => void;
};

export type ExtensionCardProps = InstalledExtensionCardProps | MarketplaceExtensionCardProps;

const isInstalledVariant = (props: ExtensionCardProps): props is InstalledExtensionCardProps => {
  return props.variant === "installed";
};

export const ExtensionCard: React.FC<ExtensionCardProps> = (props) => {
  const { id, name, description, version } = props;
  return (
    <div className={styles.container}>
      {/* Three-dot menu - only for installed extensions */}
      {isInstalledVariant(props) && (
        <div className={styles.menu}>
          <MenuActions id={`menu-actions-for-extension-${id}`} usePortal toolbar={false}>
            {props.isCompatible && (
              <MenuItem disabled={props.isUninstalling} onClick={props.onToggle}>
                <Icon material={props.isEnabled ? "unpublished" : "check_circle"} />
                <span className="title" aria-disabled={props.isUninstalling}>
                  {props.isEnabled ? "Disable" : "Enable"}
                </span>
              </MenuItem>
            )}
            <MenuItem disabled={props.isUninstalling} onClick={props.onUninstall}>
              <Icon material="delete" />
              <span className="title" aria-disabled={props.isUninstalling}>
                Uninstall
              </span>
            </MenuItem>
          </MenuActions>
        </div>
      )}

      {/* Extension icon and name */}
      <div className={styles.header}>
        <div className={styles.icon}>
          <Icon material="extension" className={styles.iconSvg} />
        </div>
        <div className={styles.contentWrap}>
          <div className={styles.name}>{name}</div>
        </div>
      </div>

      {/* Description */}
      <div className={styles.description}>{description || "No description available"}</div>

      {/* Footer with version and action button */}
      <div className={styles.footer}>
        <div className={styles.version}>{version}</div>
        {isInstalledVariant(props) ? (
          <button
            disabled={props.isUninstalling || !props.isCompatible}
            onClick={props.onUninstall}
            className={`${styles.button} ${styles.uninstallButton} ${props.isUninstalling ? styles.uninstalling : ""}`}
          >
            Uninstall
          </button>
        ) : (
          <button onClick={props.onInstall} className={`${styles.button} ${styles.installButton}`}>
            Install
          </button>
        )}
      </div>

      {/* Status badges - only for installed extensions */}
      {isInstalledVariant(props) && !props.isCompatible && <div className={`${styles.badge} ${styles.incompatible}`}>Incompatible</div>}
      {isInstalledVariant(props) && !props.isEnabled && props.isCompatible && <div className={`${styles.badge} ${styles.disabled}`}>Disabled</div>}
    </div>
  );
};
