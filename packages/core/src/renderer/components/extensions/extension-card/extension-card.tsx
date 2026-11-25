/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { ExtensionActionButton } from "./extension-action-button/extension-action-button";
import { ExtensionAuthors } from "./extension-authors/extension-authors";
import styles from "./extension-card.module.scss";
import { ExtensionCardMenu } from "./extension-card-menu/extension-card-menu";
import { ExtensionIcon } from "./extension-icon/extension-icon";
import { ExtensionPackageTitle } from "./extension-package-title/extension-package-title";
import { ExtensionStatusBadge } from "./extension-status-badge/extension-status-badge";
import { ExtensionVersionPill } from "./extension-version-pill/extension-version-pill";
import { useExtensionCard } from "./use-extension-card.hook";

import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { MarketplaceExtension } from "../marketplace-extensions/marketplace-extensions.injectable";

interface MarketplaceCardProps {
  variant: "marketplace";
  extension: MarketplaceExtension;
  installedExtension?: InstalledExtension;
  isInstalling?: boolean;
  isUpdating?: boolean;
  isUninstalling?: boolean;
  isDisabled?: boolean;
  onInstall: () => void;
  onUpdate: () => void;
  onUninstall: () => void;
  onDisable: () => void;
  onEnable: () => void;
}

interface InstalledCardProps {
  variant: "installed";
  extension: InstalledExtension;
  isInstalling?: boolean;
  isUninstalling?: boolean;
  isDisabled?: boolean;
  onUninstall: () => void;
  onDisable: () => void;
  onEnable: () => void;
}

export type ExtensionCardProps = MarketplaceCardProps | InstalledCardProps;

export const ExtensionCard: React.FC<ExtensionCardProps> = (props) => {
  const {
    isDisabled,
    installedExtension,
    name,
    version,
    description,
    status,
    authors,
    ctaState,
    ctaHandler,
    testId,
    repository,
  } = useExtensionCard(props);

  return (
    <div className={`${styles.card} ${isDisabled ? styles.disabled : ""}`} data-testid={testId}>
      {isDisabled && <div className={styles.disabledOverlay} />}
      <div className={styles.iconColumn}>
        <ExtensionIcon disabled={isDisabled} />
        <ExtensionVersionPill version={version} />
      </div>

      <div className={styles.metadata}>
        <div className={styles.headerRow}>
          <ExtensionStatusBadge variant={status} />
          <ExtensionPackageTitle name={name} repository={repository} />
        </div>
        <div className={styles.metaRow}>
          <ExtensionAuthors authors={authors ?? []} disabled={isDisabled} />
        </div>
        <p className={`${styles.description} ${isDisabled ? styles.textDisabled : ""}`}>{description}</p>
      </div>

      <div className={`${styles.footer} ${isDisabled ? styles.footerLifted : ""}`}>
        <div className={styles.footerTop}>
          {isDisabled && <span className={styles.statusDisabled}>DISABLED</span>}
          {installedExtension && (
            <ExtensionCardMenu
              id={installedExtension.id}
              isEnabled={installedExtension.isEnabled}
              onDisable={props.onDisable}
              onEnable={props.onEnable}
              onUninstall={props.onUninstall}
            />
          )}
        </div>
        <div className={styles.ctaArea}>
          <ExtensionActionButton state={ctaState} onClick={ctaHandler} />
        </div>
      </div>
    </div>
  );
};
