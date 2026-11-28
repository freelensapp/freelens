/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import React, { useId, useState } from "react";
import { Card } from "../../card";
import { ExtensionActionButton } from "./extension-action-button/extension-action-button";
import { ExtensionAuthors } from "./extension-authors/extension-authors";
import styles from "./extension-card.module.scss";
import { ExtensionCardMenu } from "./extension-card-menu/extension-card-menu";
import { ExtensionDetails } from "./extension-details/extension-details";
import { ExtensionIcon } from "./extension-icon/extension-icon";
import { ExtensionPackageTitle } from "./extension-package-title/extension-package-title";
import { ExtensionProvenance } from "./extension-provenance/extension-provenance";
import { ExtensionStatusBadge } from "./extension-status-badge/extension-status-badge";
import { ExtensionVersionPill } from "./extension-version-pill/extension-version-pill";
import { useExtensionCard } from "./use-extension-card.hook";

import type { ExtensionLoadFailureInProcess } from "../../../../extensions/extension-loader/load-failure";
import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { InstalledExtensionSource } from "../../../../features/extensions/installer/common/installed-extensions";
import type { ExtensionStatus } from "../extension-status";
import type { MarketplaceExtension } from "../marketplace-extensions/marketplace-extensions.injectable";

/**
 * The same card in both views: an extension of the marketplace, installed or
 * not, and an installed extension, in the marketplace or not. At least one of
 * `entry` and `installed` is given.
 */
export interface ExtensionCardProps {
  /** The entry of the marketplace for the extension, when it has one. */
  entry?: MarketplaceExtension;
  /** The extension as installed, when it is. */
  installed?: InstalledExtension;
  /** What the installed extension was installed from, when the install recorded it. */
  installedSource?: InstalledExtensionSource;
  loadFailures?: ExtensionLoadFailureInProcess[];
  isInstalling?: boolean;
  isUpdating?: boolean;
  isUninstalling?: boolean;
  onInstall: () => void;
  onUpdate: () => void;
  /** Installs the version of the marketplace again, in place of the installed one. */
  onReinstall: () => void;
  onUninstall: () => void;
  onEnable: () => void;
  onDisable: () => void;
  /**
   * Whether the details are shown, for a list that keeps one card expanded at
   * a time. Without it, the card keeps the state itself.
   */
  isExpanded?: boolean;
  /** Asks the list to expand or collapse the card; given with `isExpanded`. */
  onToggleExpanded?: () => void;
}

/**
 * What a click on the card leaves to the element it is on, rather than
 * expanding or collapsing the card: its buttons and links, the icons that act
 * as buttons, such as the trigger of its menu, and the menu and the popovers it
 * opens, whose events reach the card through their portal.
 */
const interactiveElements =
  'a, button, input, select, textarea, [role="button"], .Icon.interactive, [role="dialog"], .Menu';

const isToggleClick = (event: React.MouseEvent) => {
  const target = event.target as Element;

  // Selecting text in the card is not a click on it.
  return !target.closest(interactiveElements) && !globalThis.getSelection()?.toString();
};

const statusClasses: Record<ExtensionStatus, string> = {
  Enabled: styles.statusEnabled,
  Disabled: "",
  Incompatible: styles.statusFailing,
  "Failed to load": styles.statusFailing,
};

export const ExtensionCard: React.FC<ExtensionCardProps> = (props) => {
  const { entry, installed, isInstalling = false, isUpdating = false, isUninstalling = false } = props;
  const {
    name,
    displayName,
    version,
    description,
    tier,
    authors,
    license,
    iconUrl,
    link,
    status,
    statusDescription,
    provenance,
    details,
    isDimmed,
    ctaState,
    ctaHandler,
    testId,
  } = useExtensionCard(props);

  const [isExpandedByItself, setIsExpandedByItself] = useState(false);
  const isExpanded = props.isExpanded ?? isExpandedByItself;
  const toggle = props.onToggleExpanded ?? (() => setIsExpandedByItself((expanded) => !expanded));
  const detailsId = useId();
  const dimmed = isDimmed ? styles.dimmed : "";

  return (
    <Card aria-label={displayName ?? name} data-testid={testId}>
      {/* The button below does the same from the keyboard. */}
      <div
        className={styles.layout}
        data-status={status?.toLowerCase().replaceAll(" ", "-")}
        onClick={(event) => isToggleClick(event) && toggle()}
      >
        <div className={`${styles.iconColumn} ${dimmed}`}>
          <ExtensionIcon disabled={isDimmed} src={iconUrl} />
        </div>

        <div className={`${styles.metadata} ${dimmed}`}>
          <div className={styles.headerRow}>
            <ExtensionStatusBadge variant={tier} />
            <ExtensionPackageTitle name={name} displayName={displayName} link={link} />
            <ExtensionVersionPill version={version} />
            {provenance && installed && (
              <ExtensionProvenance provenance={provenance} absolutePath={installed.absolutePath} />
            )}
          </div>
          <div className={styles.metaRow}>
            <ExtensionAuthors authors={authors} disabled={isDimmed} />
            {license && (
              <span className={styles.license} data-testid="extension-license">
                {license}
              </span>
            )}
          </div>
          <p className={styles.description}>{description}</p>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerTop}>
            {status && (
              <span
                className={`${styles.status} ${statusClasses[status]}`}
                title={statusDescription}
                data-testid="extension-status"
              >
                {status}
              </span>
            )}
            <ExtensionCardMenu
              id={installed?.id ?? entry?.id ?? name}
              isInstalled={Boolean(installed)}
              isEnabled={installed?.isEnabled ?? false}
              canToggle={installed?.isCompatible ?? false}
              isBusy={isInstalling || isUpdating || isUninstalling}
              onInstall={props.onInstall}
              onDisable={props.onDisable}
              onEnable={props.onEnable}
              onUninstall={props.onUninstall}
              onReinstall={entry && installed ? props.onReinstall : undefined}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={toggle}
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              aria-label={isExpanded ? "Hide details" : "Show details"}
              data-testid="extension-card-toggle"
            >
              <Icon material="expand_more" className={styles.chevron} />
            </button>
          </div>
          <div className={styles.ctaArea}>
            <ExtensionActionButton state={ctaState} onClick={ctaHandler} />
          </div>
        </div>
      </div>
      <div id={detailsId} className={styles.collapsible} data-collapsed={!isExpanded || undefined} inert={!isExpanded}>
        <div>
          <ExtensionDetails details={details} />
        </div>
      </div>
    </Card>
  );
};
