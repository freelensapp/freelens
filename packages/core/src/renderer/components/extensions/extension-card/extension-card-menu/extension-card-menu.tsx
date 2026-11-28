import { Icon } from "@freelensapp/icon";
import React from "react";
import { MenuActions, MenuItem } from "../../../menu";

export interface ExtensionCardMenuProps {
  id: string;
  /** An extension that is not installed is offered to be installed, and nothing else. */
  isInstalled: boolean;
  isEnabled: boolean;
  /** An incompatible extension cannot be enabled, so it is not offered. */
  canToggle: boolean;
  /** While the extension is installed or uninstalled, the menu offers nothing. */
  isBusy: boolean;
  onInstall: () => void;
  onDisable: () => void;
  onEnable: () => void;
  onUninstall: () => void;
  /** Installs the version of the marketplace again; given for an extension that is in the marketplace. */
  onReinstall?: () => void;
}

export const ExtensionCardMenu: React.FC<ExtensionCardMenuProps> = ({
  id,
  isInstalled,
  isEnabled,
  canToggle,
  isBusy,
  onInstall,
  onDisable,
  onEnable,
  onUninstall,
  onReinstall,
}) => (
  <MenuActions id={`extension-card-menu-${id}`} usePortal toolbar={false} data-testid="extension-card-menu">
    {!isInstalled && (
      <MenuItem disabled={isBusy} onClick={onInstall}>
        <Icon material="download" />
        <span className="title" aria-disabled={isBusy}>
          Install
        </span>
      </MenuItem>
    )}
    {isInstalled && canToggle && (
      <MenuItem disabled={isBusy} onClick={isEnabled ? onDisable : onEnable}>
        <Icon material={isEnabled ? "unpublished" : "check_circle"} />
        <span className="title" aria-disabled={isBusy}>
          {isEnabled ? "Disable" : "Enable"}
        </span>
      </MenuItem>
    )}
    {isInstalled && onReinstall && (
      <MenuItem disabled={isBusy} onClick={onReinstall}>
        <Icon material="refresh" />
        <span className="title" aria-disabled={isBusy}>
          Reinstall
        </span>
      </MenuItem>
    )}
    {isInstalled && (
      <MenuItem disabled={isBusy} onClick={onUninstall}>
        <Icon material="delete" />
        <span className="title" aria-disabled={isBusy}>
          Uninstall
        </span>
      </MenuItem>
    )}
  </MenuActions>
);
