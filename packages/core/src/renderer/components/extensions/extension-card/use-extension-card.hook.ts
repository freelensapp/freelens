/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as verkit from "verkit";

import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { MarketplaceExtension } from "../marketplace-extensions/marketplace-extensions.injectable";
import type { ExtensionActionState } from "./extension-action-button/extension-action-button";
import type { ExtensionCardProps } from "./extension-card";

const hasNewerVersion = (marketplaceVersion: string, installedVersion: string): boolean =>
  verkit.isGreaterThan(marketplaceVersion, installedVersion);

const deriveCtaState = (props: ExtensionCardProps): ExtensionActionState => {
  if (props.variant === "marketplace" && props.isUpdating) return "updating";

  if (props.variant === "marketplace" && props.installedExtension) {
    const updateAvailable = hasNewerVersion(props.extension.version, props.installedExtension.manifest.version);

    if (updateAvailable) {
      return props.isInstalling ? "updating" : "update";
    }
  }

  if (props.isInstalling) return "installing";
  if (props.isUninstalling) return "uninstalling";
  if (props.variant === "installed") return "uninstall";
  if (props.variant === "marketplace" && props.installedExtension) return "uninstall";
  return "install";
};

const deriveCtaHandler = (props: ExtensionCardProps, ctaState: ExtensionActionState): (() => void) => {
  if (props.variant !== "marketplace") return props.onUninstall;
  if (ctaState === "update" || ctaState === "updating") return props.onUpdate;
  return props.installedExtension ? props.onUninstall : props.onInstall;
};

const deriveCardTestId = (props: ExtensionCardProps): string =>
  props.variant === "installed" || (props.variant === "marketplace" && props.installedExtension)
    ? "installed-extension-card"
    : "marketplace-extension-card";

export interface UseExtensionCardResult {
  isMarketplace: boolean;
  isDisabled: boolean;
  installedExtension: InstalledExtension | undefined;
  name: string;
  version: string;
  description: string;
  status: "official" | "community";
  authors: MarketplaceExtension["authors"];
  ctaState: ExtensionActionState;
  ctaHandler: () => void;
  testId: string;
  repository: string | undefined;
}

export const useExtensionCard = (props: ExtensionCardProps): UseExtensionCardResult => {
  const isMarketplace = props.variant === "marketplace";
  const isDisabled = props.isDisabled === true;
  const installedExtension = isMarketplace ? props.installedExtension : props.extension;

  const name = isMarketplace ? props.extension.name : props.extension.manifest.name;
  const version = isMarketplace ? props.extension.version : props.extension.manifest.version;
  const description = isMarketplace
    ? props.extension.description
    : props.extension.manifest.description || "No description available";
  const status = isMarketplace ? props.extension.status : "official";
  const authors = isMarketplace ? (props.extension.authors ?? []) : [];

  const ctaState = deriveCtaState(props);
  const ctaHandler = deriveCtaHandler(props, ctaState);

  return {
    isMarketplace,
    isDisabled,
    installedExtension,
    name,
    version,
    description,
    status,
    authors,
    ctaState,
    ctaHandler,
    testId: deriveCardTestId(props),
    repository: isMarketplace ? props.extension.repository : undefined,
  };
};
