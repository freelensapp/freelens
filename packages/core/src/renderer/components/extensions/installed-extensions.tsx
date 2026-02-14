/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import extensionDiscoveryInjectable from "../../../extensions/extension-discovery/extension-discovery.injectable";
import extensionInstallationStateStoreInjectable from "../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import confirmUninstallExtensionInjectable from "./confirm-uninstall-extension.injectable";
import disableExtensionInjectable from "./disable-extension.injectable";
import enableExtensionInjectable from "./enable-extension.injectable";
import { ExtensionCard } from "./extension-card";
import { ExtensionsGrid } from "./extensions-grid";
import styles from "./installed-extensions.module.scss";
import { SearchBar } from "./search-bar";
import userExtensionsInjectable from "./user-extensions/user-extensions.injectable";

import type { InstalledExtension } from "@freelensapp/legacy-extensions";

import type { IComputedValue } from "mobx";

import type { ExtensionDiscovery } from "../../../extensions/extension-discovery/extension-discovery";
import type { ExtensionInstallationStateStore } from "../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ConfirmUninstallExtension } from "./confirm-uninstall-extension.injectable";
import type { DisableExtension } from "./disable-extension.injectable";
import type { EnableExtension } from "./enable-extension.injectable";

export interface InstalledExtensionsProps {}

interface Dependencies {
  extensionDiscovery: ExtensionDiscovery;
  extensionInstallationStateStore: ExtensionInstallationStateStore;
  userExtensions: IComputedValue<InstalledExtension[]>;
  enableExtension: EnableExtension;
  disableExtension: DisableExtension;
  confirmUninstallExtension: ConfirmUninstallExtension;
}

const NonInjectedInstalledExtensions = observer(
  ({
    extensionDiscovery,
    extensionInstallationStateStore,
    userExtensions,
    confirmUninstallExtension,
    enableExtension,
    disableExtension,
  }: Dependencies & InstalledExtensionsProps) => {
    if (!extensionDiscovery.isLoaded) {
      return (
        <div>
          <Spinner center />
        </div>
      );
    }

    const [searchQuery, setSearchQuery] = useState("");
    const extensions = userExtensions.get();

    const filteredExtensions = extensions.filter(
      (ext) =>
        ext.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ext.manifest.description && ext.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    if (extensions.length === 0) {
      return (
        <div className="flex column h-full items-center justify-center">
          <Icon material="extension" className={styles.noItemsIcon} />
          <h3 className="font-medium text-3xl mt-5 mb-2">There are no extensions installed.</h3>
          <p>Please use the form above to install or drag a tarball file here.</p>
        </div>
      );
    }

    const toggleExtensionWith = (enabled: boolean) => (enabled ? disableExtension : enableExtension);

    return (
      <section data-testid="extensions-table">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search..." />
        <ExtensionsGrid>
          {filteredExtensions.map((extension) => {
            const { id, isEnabled, isCompatible, manifest } = extension;
            const { name, description, version } = manifest;
            const isUninstalling = extensionInstallationStateStore.isExtensionUninstalling(id);
            const toggleExtension = toggleExtensionWith(isEnabled);

            return (
              <ExtensionCard
                key={id}
                variant="installed"
                id={id}
                name={name}
                description={description || "No description available"}
                version={version}
                isEnabled={isEnabled}
                isCompatible={isCompatible}
                isUninstalling={isUninstalling}
                onUninstall={() => confirmUninstallExtension(extension)}
                onToggle={() => toggleExtension(id)}
              />
            );
          })}
        </ExtensionsGrid>
      </section>
    );
  },
);

export const InstalledExtensions = withInjectables<Dependencies, InstalledExtensionsProps>(
  NonInjectedInstalledExtensions,
  {
    getProps: (di, props) => ({
      ...props,
      extensionDiscovery: di.inject(extensionDiscoveryInjectable),
      extensionInstallationStateStore: di.inject(extensionInstallationStateStoreInjectable),
      userExtensions: di.inject(userExtensionsInjectable),
      enableExtension: di.inject(enableExtensionInjectable),
      disableExtension: di.inject(disableExtensionInjectable),
      confirmUninstallExtension: di.inject(confirmUninstallExtensionInjectable),
    }),
  },
);
