/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { when } from "mobx";
import { useMemo, useState } from "react";
import {
  clearMarketplaceInstalling,
  clearMarketplaceUpdating,
  markMarketplaceInstalling,
  markMarketplaceUpdating,
} from "./marketplace-installing-store";

import type { IComputedValue } from "mobx";

import type { IAsyncComputed } from "../../../../common/utils/async-computed";
import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ConfirmUninstallExtension } from "../confirm-uninstall-extension.injectable";
import type { InstallExtensionFromInput } from "../install-extension-from-input.injectable";
import type { MarketplaceExtension } from "./marketplace-extensions.injectable";

export interface UseMarketplaceExtensionsArgs {
  marketplaceExtensions: IAsyncComputed<MarketplaceExtension[]>;
  installedExtensionsByName: IComputedValue<Map<string, InstalledExtension>>;
  extensionInstallationStateStore: ExtensionInstallationStateStore;
  installExtensionFromInput: InstallExtensionFromInput;
  confirmUninstallExtension: ConfirmUninstallExtension;
}

export interface UseMarketplaceExtensionsResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filteredExtensions: MarketplaceExtension[];
  installedMap: Map<string, InstalledExtension>;
  withKey: (ext: MarketplaceExtension) => string;
  onInstall: (ext: MarketplaceExtension) => void;
  onUpdate: (ext: MarketplaceExtension) => void;
  onUninstall: (installed: InstalledExtension) => void;
}

export const useMarketplaceExtensions = ({
  marketplaceExtensions,
  installedExtensionsByName,
  extensionInstallationStateStore: _extensionInstallationStateStore,
  installExtensionFromInput,
  confirmUninstallExtension,
}: UseMarketplaceExtensionsArgs): UseMarketplaceExtensionsResult => {
  const [searchQuery, setSearchQuery] = useState("");

  const extensions = marketplaceExtensions.value.get();
  const installedMap = installedExtensionsByName.get();

  const filteredExtensions = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    return extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(lowerCaseQuery) || ext.description.toLowerCase().includes(lowerCaseQuery),
    );
  }, [extensions, searchQuery]);

  const withKey = (ext: MarketplaceExtension) => `${ext.name}@${ext.version}`;

  const onInstall = (ext: MarketplaceExtension) => {
    const key = withKey(ext);
    markMarketplaceInstalling(key);
    void installExtensionFromInput(`${ext.name}@${ext.version}`).finally(() => {
      clearMarketplaceInstalling(key);
    });
  };

  const onUpdate = (ext: MarketplaceExtension) => {
    const key = withKey(ext);
    markMarketplaceUpdating(key);

    // The update flow uninstalls the old version before installing the new one,
    // so the extension briefly disappears from the installed list.
    // Keep the "updating" state until the extension is installed again at the target version.
    void installExtensionFromInput(`${ext.name}@${ext.version}`)
      .then(() =>
        when(
          () => {
            const installed = installedExtensionsByName.get().get(ext.name);

            return installed?.manifest.version === ext.version;
          },
          { timeout: 30_000 },
        ).catch(() => undefined),
      )
      .finally(() => {
        clearMarketplaceUpdating(key);
      });
  };

  const onUninstall = (installed: InstalledExtension) => {
    void confirmUninstallExtension(installed);
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredExtensions,
    installedMap,
    withKey,
    onInstall,
    onUpdate,
    onUninstall,
  };
};
