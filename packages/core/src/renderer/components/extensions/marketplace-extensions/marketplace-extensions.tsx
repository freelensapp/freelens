/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import confirmUninstallExtensionInjectable from "../confirm-uninstall-extension.injectable";
import disableExtensionInjectable from "../disable-extension.injectable";
import enableExtensionInjectable from "../enable-extension.injectable";
import { ExtensionCard } from "../extension-card/extension-card";
import layoutStyles from "../extensions.module.scss";
import installExtensionFromInputInjectable from "../install-extension-from-input.injectable";
import { SearchBar } from "../search-bar/search-bar";
import installedExtensionsByNameInjectable from "../user-extensions/installed-extensions-by-name.injectable";
import marketplaceExtensionsInjectable from "./marketplace-extensions.injectable";
import styles from "./marketplace-extensions.module.scss";
import { isMarketplaceInstalling, isMarketplaceUpdating } from "./marketplace-installing-store";
import { useMarketplaceExtensions } from "./use-marketplace-extensions.hook";

import type { IComputedValue } from "mobx";

import type { IAsyncComputed } from "../../../../common/utils/async-computed";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { ConfirmUninstallExtension } from "../confirm-uninstall-extension.injectable";
import type { DisableExtension } from "../disable-extension.injectable";
import type { EnableExtension } from "../enable-extension.injectable";
import type { InstallExtensionFromInput } from "../install-extension-from-input.injectable";
import type { MarketplaceExtension } from "./marketplace-extensions.injectable";

interface Dependencies {
  installExtensionFromInput: InstallExtensionFromInput;
  marketplaceExtensions: IAsyncComputed<MarketplaceExtension[]>;
  installedExtensionsByName: IComputedValue<Map<string, InstalledExtension>>;
  confirmUninstallExtension: ConfirmUninstallExtension;
  extensionInstallationStateStore: ExtensionInstallationStateStore;
  enableExtension: EnableExtension;
  disableExtension: DisableExtension;
}

const NonInjectedMarketplaceExtensions = observer(
  ({
    marketplaceExtensions,
    installExtensionFromInput,
    installedExtensionsByName,
    confirmUninstallExtension,
    extensionInstallationStateStore,
    enableExtension,
    disableExtension,
  }: Dependencies) => {
    const { searchQuery, setSearchQuery, filteredExtensions, installedMap, withKey, onInstall, onUpdate, onUninstall } =
      useMarketplaceExtensions({
        marketplaceExtensions,
        installedExtensionsByName,
        extensionInstallationStateStore,
        installExtensionFromInput,
        confirmUninstallExtension,
      });

    if (marketplaceExtensions.pending.get()) {
      return (
        <section data-testid="marketplace-extensions">
          <div className={styles.loadingState}>
            <Icon material="extension" size={100} className={styles.loadingIcon} />
            <div className={styles.loadingRow}>
              <Spinner className={styles.loadingSpinner} />
              <p className={styles.emptyText}>Loading extensions…</p>
            </div>
          </div>
        </section>
      );
    }

    if (filteredExtensions.length === 0) {
      return (
        <section data-testid="marketplace-extensions">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search Extensions..." />
          <div className={`flex column h-full items-center justify-center ${styles.emptyState}`}>
            <Icon material="extension" className={styles.iconLarge} />
            <h3 className="font-medium text-2xl mb-2">No extensions found</h3>
            <p className={styles.emptyText}>Try a different search term</p>
          </div>
        </section>
      );
    }

    return (
      <section data-testid="marketplace-extensions">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search Extensions..." />
        <div className={layoutStyles.grid}>
          {filteredExtensions.map((extension) => {
            const installed = installedMap.get(extension.name);
            const key = withKey(extension);
            const isInstalling = isMarketplaceInstalling(key);
            const isUpdating = isMarketplaceUpdating(key);
            const isDisabled = installed?.isEnabled === false;
            const isUninstalling = installed
              ? extensionInstallationStateStore.isExtensionUninstalling(installed.id)
              : false;

            return (
              <ExtensionCard
                key={extension.id}
                variant="marketplace"
                extension={extension}
                installedExtension={installed}
                isInstalling={isInstalling}
                isUpdating={isUpdating}
                isUninstalling={isUninstalling}
                isDisabled={isDisabled}
                onInstall={() => onInstall(extension)}
                onUpdate={() => onUpdate(extension)}
                onUninstall={() => installed && onUninstall(installed)}
                onDisable={() => installed && disableExtension(installed.id)}
                onEnable={() => installed && enableExtension(installed.id)}
              />
            );
          })}
        </div>
      </section>
    );
  },
);

export const MarketplaceExtensions = withInjectables<Dependencies>(NonInjectedMarketplaceExtensions, {
  getProps: (di) => ({
    installExtensionFromInput: di.inject(installExtensionFromInputInjectable),
    marketplaceExtensions: di.inject(marketplaceExtensionsInjectable),
    installedExtensionsByName: di.inject(installedExtensionsByNameInjectable),
    confirmUninstallExtension: di.inject(confirmUninstallExtensionInjectable),
    extensionInstallationStateStore: di.inject(extensionInstallationStateStoreInjectable),
    enableExtension: di.inject(enableExtensionInjectable),
    disableExtension: di.inject(disableExtensionInjectable),
  }),
});
