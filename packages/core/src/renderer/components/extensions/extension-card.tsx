/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import React from "react";
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
    <div
      style={{
        backgroundColor: "var(--contentColor)",
        borderRadius: "8px",
        padding: "1.5rem",
        border: "1px solid var(--borderColor)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        height: "100%",
        minHeight: "240px",
      }}
    >
      {/* Three-dot menu - only for installed extensions */}
      {isInstalledVariant(props) && (
        <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #00d4aa 0%, #00a3cc 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon material="extension" style={{ color: "white", fontSize: "24px" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: "0.25rem" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.9375rem",
              lineHeight: "1.3",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
          >
            {name}
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: "0.875rem",
          color: "var(--textColorSecondary)",
          marginBottom: "1rem",
          lineHeight: "1.4",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          flex: 1,
          wordBreak: "break-word",
        }}
      >
        {description || "No description available"}
      </div>

      {/* Footer with version and action button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          paddingTop: "1rem",
          borderTop: "1px solid var(--borderFaintColor)",
        }}
      >
        <div style={{ fontSize: "0.875rem", color: "var(--textColorSecondary)" }}>{version}</div>
        {isInstalledVariant(props) ? (
          <button
            disabled={props.isUninstalling || !props.isCompatible}
            onClick={props.onUninstall}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "4px",
              border: "none",
              backgroundColor: props.isUninstalling ? "#666" : "#e74c3c",
              color: "white",
              fontWeight: 500,
              cursor: props.isUninstalling ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              opacity: props.isUninstalling ? 0.5 : 1,
            }}
          >
            Uninstall
          </button>
        ) : (
          <button
            onClick={props.onInstall}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "#00d4aa",
              color: "white",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Install
          </button>
        )}
      </div>

      {/* Status badges - only for installed extensions */}
      {isInstalledVariant(props) && !props.isCompatible && (
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "4px",
            backgroundColor: "#e74c3c",
            color: "white",
          }}
        >
          Incompatible
        </div>
      )}
      {isInstalledVariant(props) && !props.isEnabled && props.isCompatible && (
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "4px",
            backgroundColor: "#95a5a6",
            color: "white",
          }}
        >
          Disabled
        </div>
      )}
    </div>
  );
};
