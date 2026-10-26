/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { Spinner } from "@freelensapp/spinner";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useState } from "react";
import extensionDiscoveryInjectable from "../../../extensions/extension-discovery/extension-discovery.injectable";
import extensionInstallationStateStoreInjectable from "../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import { describeExtensionLoadStage } from "../../../extensions/extension-loader/load-failure";
import { SearchInput } from "../input";
import { MenuActions, MenuItem } from "../menu";
import { SortableTable } from "../table/sortable-table";
import confirmUninstallExtensionInjectable from "./confirm-uninstall-extension.injectable";
import disableExtensionInjectable from "./disable-extension.injectable";
import enableExtensionInjectable from "./enable-extension.injectable";
import { getMessageFromError } from "./get-message-from-error/get-message-from-error";
import styles from "./installed-extensions.module.scss";
import userExtensionsInjectable from "./user-extensions/user-extensions.injectable";

import type { ShowNotification } from "@freelensapp/notifications";

import type { IComputedValue } from "mobx";

import type { ExtensionDiscovery } from "../../../extensions/extension-discovery/extension-discovery";
import type { ExtensionInstallationStateStore } from "../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ExtensionLoadFailureInProcess } from "../../../extensions/extension-loader/load-failure";
import type { InstalledExtension, LensExtensionId } from "../../../extensions/installed-extension";
import type { SortableTableColumn } from "../table/sortable-table";
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
  showErrorNotification: ShowNotification;
  getLoadFailures: (extensionId: LensExtensionId) => ExtensionLoadFailureInProcess[];
}

function getStatus(extension: InstalledExtension, loadFailures: ExtensionLoadFailureInProcess[]) {
  if (!extension.isCompatible) {
    return "Incompatible";
  }

  if (!extension.isEnabled) {
    return "Disabled";
  }

  return loadFailures.length > 0 ? "Failed to load" : "Enabled";
}

const describeLoadFailures = (loadFailures: ExtensionLoadFailureInProcess[]) =>
  loadFailures
    .map(
      ({ process, stage, message }) =>
        `Failed in the ${process} process while ${describeExtensionLoadStage(stage)}: ${message}`,
    )
    .join("\n");

const NonInjectedInstalledExtensions = observer(
  ({
    extensionDiscovery,
    extensionInstallationStateStore,
    userExtensions,
    confirmUninstallExtension,
    enableExtension,
    disableExtension,
    showErrorNotification,
    getLoadFailures,
  }: Dependencies & InstalledExtensionsProps) => {
    const [search, setSearch] = useState("");

    if (!extensionDiscovery.isLoaded) {
      return (
        <div>
          <Spinner center />
        </div>
      );
    }

    const extensions = userExtensions.get();

    if (extensions.length == 0) {
      return (
        <div className="flex flex-col h-full items-center justify-center">
          <Icon material="extension" className={styles.noItemsIcon} />
          <h3 className="font-medium text-3xl mt-5 mb-2">There are no extensions installed.</h3>
          <p>Please use the form above to install or drag a tarball file here.</p>
        </div>
      );
    }

    const statusOf = (extension: InstalledExtension) => getStatus(extension, getLoadFailures(extension.id));
    const query = search.toLowerCase();
    const matchedExtensions = extensions.filter((extension) =>
      [extension.manifest.name, extension.manifest.version, statusOf(extension)].some((field) =>
        String(field).toLowerCase().includes(query),
      ),
    );

    const toggleExtensionWith = (enabled: boolean) => (enabled ? disableExtension : enableExtension);

    const columns: SortableTableColumn<InstalledExtension>[] = [
      {
        id: "extension",
        title: "Name",
        // Percentages, to keep the proportions `react-table`'s flex weights
        // used to give these columns (200 / 100 / 100 / 20)
        width: "48%",
        sortBy: (extension) => extension.manifest.name,
        renderCell: (extension) => (
          <div>
            <div className={styles.extensionName}>{extension.manifest.name}</div>
            <div className={styles.extensionDescription}>{extension.manifest.description}</div>
          </div>
        ),
      },
      {
        id: "version",
        title: "Version",
        width: "22%",
        sortBy: (extension) => extension.manifest.version,
        renderCell: (extension) => (
          <div>
            <div>{extension.manifest.version}</div>
            {!extension.isManaged ? (
              <div className={styles.extensionProvenance} title={`Loaded from ${extension.absolutePath}`}>
                development
              </div>
            ) : extension.isVerified ? (
              <div
                className={cssNames(styles.extensionProvenance, styles.verified)}
                title="Its checksum was verified when this was installed"
              >
                verified
              </div>
            ) : (
              <div
                className={cssNames(styles.extensionProvenance, styles.unverified)}
                title="No checksum was available when this was installed"
              >
                unverified
              </div>
            )}
          </div>
        ),
      },
      {
        id: "status",
        title: "Status",
        width: "22%",
        sortBy: statusOf,
        renderCell: (extension) => {
          // A failure is only reported for an extension the user wants to run:
          // disabling it is what takes the failure away.
          const loadFailures = extension.isEnabled ? getLoadFailures(extension.id) : [];
          const hasFailed = extension.isCompatible && loadFailures.length > 0;

          return (
            <div
              className={cssNames({
                [styles.enabled]: extension.isEnabled && !hasFailed,
                [styles.invalid]: !extension.isCompatible || hasFailed,
              })}
              title={hasFailed ? describeLoadFailures(loadFailures) : undefined}
            >
              {getStatus(extension, loadFailures)}
            </div>
          );
        },
      },
      {
        id: "actions",
        title: "",
        width: "8%",
        renderCell: (extension) => {
          const { id, isEnabled, isCompatible } = extension;
          const isUninstalling = extensionInstallationStateStore.isExtensionUninstalling(id);
          const toggleExtension = toggleExtensionWith(isEnabled);

          return (
            <div className="flex justify-end">
              <MenuActions id={`menu-actions-for-installed-extensions-for-${id}`} usePortal toolbar={false}>
                {isCompatible && (
                  <MenuItem
                    disabled={isUninstalling}
                    onClick={() =>
                      toggleExtension(id).catch((error) =>
                        showErrorNotification(
                          `Failed to ${isEnabled ? "disable" : "enable"} ${extension.manifest.name}: ${getMessageFromError(error)}`,
                        ),
                      )
                    }
                  >
                    <Icon material={isEnabled ? "unpublished" : "check_circle"} />
                    <span className="title" aria-disabled={isUninstalling}>
                      {isEnabled ? "Disable" : "Enabled"}
                    </span>
                  </MenuItem>
                )}

                <MenuItem disabled={isUninstalling} onClick={() => confirmUninstallExtension(extension)}>
                  <Icon material="delete" />
                  <span className="title" aria-disabled={isUninstalling}>
                    Uninstall
                  </span>
                </MenuItem>
              </MenuActions>
            </div>
          );
        },
      },
    ];

    return (
      <section data-testid="extensions-table">
        <div className="flex items-center justify-between mb-6">
          <div className="mr-6">
            <h2 className={styles.title}>Installed extensions</h2>
          </div>
          <div>
            <SearchInput value={search} theme="round-black" onChange={setSearch} className={styles.searchInput} />
          </div>
        </div>
        <SortableTable columns={columns} items={matchedExtensions} getItemKey={(extension) => extension.id} />
        {matchedExtensions.length === 0 && <div className={styles.notFound}>No data found</div>}
      </section>
    );
  },
);

export const InstalledExtensions = withInjectables<Dependencies, InstalledExtensionsProps>(
  NonInjectedInstalledExtensions,
  {
    getProps: (di, props) => {
      const extensionLoader = di.inject(extensionLoaderInjectable);

      return {
        ...props,
        extensionDiscovery: di.inject(extensionDiscoveryInjectable),
        extensionInstallationStateStore: di.inject(extensionInstallationStateStoreInjectable),
        userExtensions: di.inject(userExtensionsInjectable),
        enableExtension: di.inject(enableExtensionInjectable),
        disableExtension: di.inject(disableExtensionInjectable),
        confirmUninstallExtension: di.inject(confirmUninstallExtensionInjectable),
        showErrorNotification: di.inject(showErrorNotificationInjectable),
        getLoadFailures: (extensionId) => extensionLoader.getLoadFailures(extensionId),
      };
    },
  },
);
