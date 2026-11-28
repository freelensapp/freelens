/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { when } from "mobx";
import { observer } from "mobx-react";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import installedExtensionsStateInjectable from "../../../../features/extensions/installer/common/installed-extensions-state.injectable";
import confirmInjectable from "../../confirm-dialog/confirm.injectable";
import confirmUninstallExtensionInjectable from "../confirm-uninstall-extension.injectable";
import disableExtensionInjectable from "../disable-extension.injectable";
import enableExtensionInjectable from "../enable-extension.injectable";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import installExtensionFromInputInjectable from "../install-extension-from-input.injectable";
import marketplaceExtensionsInjectable from "../marketplace-extensions/marketplace-extensions.injectable";
import {
  clearMarketplaceInstalling,
  clearMarketplaceUpdating,
  isMarketplaceInstalling,
  isMarketplaceUpdating,
  markMarketplaceInstalling,
  markMarketplaceUpdating,
} from "../marketplace-extensions/marketplace-installing-store";
import installedExtensionsByNameInjectable from "../user-extensions/installed-extensions-by-name.injectable";
import { ExtensionCard } from "./extension-card";

import type { ShowNotification } from "@freelensapp/notifications";

import type { IComputedValue } from "mobx";

import type { IAsyncComputed } from "../../../../common/utils/async-computed";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ExtensionLoadFailureInProcess } from "../../../../extensions/extension-loader/load-failure";
import type { InstalledExtension, LensExtensionId } from "../../../../extensions/installed-extension";
import type { InstalledExtensionEntry } from "../../../../features/extensions/installer/common/installed-extensions";
import type { Confirm } from "../../confirm-dialog/confirm.injectable";
import type { ConfirmUninstallExtension } from "../confirm-uninstall-extension.injectable";
import type { DisableExtension } from "../disable-extension.injectable";
import type { EnableExtension } from "../enable-extension.injectable";
import type { InstallExtensionFromInput } from "../install-extension-from-input.injectable";
import type { MarketplaceExtension } from "../marketplace-extensions/marketplace-extensions.injectable";
import type { ExtensionCardProps } from "./extension-card";

/**
 * One of the two is given, and the card finds the other: the installed
 * extension of a marketplace entry, or the marketplace entry of an installed
 * extension, both by the name of the package.
 */
export type ConnectedExtensionCardProps = ({ entry: MarketplaceExtension } | { installed: InstalledExtension }) &
  Pick<ExtensionCardProps, "isExpanded" | "onToggleExpanded">;

interface Dependencies {
  installedExtensionsByName: IComputedValue<Map<string, InstalledExtension>>;
  installedExtensionsState: Map<string, InstalledExtensionEntry>;
  marketplaceExtensions: IAsyncComputed<MarketplaceExtension[]>;
  installExtensionFromInput: InstallExtensionFromInput;
  confirm: Confirm;
  confirmUninstallExtension: ConfirmUninstallExtension;
  extensionInstallationStateStore: ExtensionInstallationStateStore;
  enableExtension: EnableExtension;
  disableExtension: DisableExtension;
  showErrorNotification: ShowNotification;
  getLoadFailures: (extensionId: LensExtensionId) => ExtensionLoadFailureInProcess[];
}

const keyOf = ({ packageName, version }: MarketplaceExtension) => `${packageName}@${version.version}`;

const NonInjectedConnectedExtensionCard = observer((props: ConnectedExtensionCardProps & Dependencies) => {
  const {
    installedExtensionsByName,
    installedExtensionsState,
    marketplaceExtensions,
    installExtensionFromInput,
    confirm,
    confirmUninstallExtension,
    extensionInstallationStateStore,
    enableExtension,
    disableExtension,
    showErrorNotification,
    getLoadFailures,
  } = props;

  const entry =
    "entry" in props
      ? props.entry
      : marketplaceExtensions.value.get().find(({ packageName }) => packageName === props.installed.manifest.name);
  const installed =
    "installed" in props ? props.installed : installedExtensionsByName.get().get(props.entry.packageName);
  const key = entry ? keyOf(entry) : undefined;

  // An item with `url` comes from that tarball, checked against its `integrity`; any other from npm.
  const install = ({ packageName, version: { version, url, integrity } }: MarketplaceExtension) =>
    url ? installExtensionFromInput(url, { integrity }) : installExtensionFromInput(`${packageName}@${version}`);

  // Asked as a `freelens://` link to install an extension asks, before anything is downloaded. An
  // update and an uninstall are asked by the installer and by the uninstall themselves.
  const onInstall = async () => {
    if (!entry || !key) return;

    const proceed = await confirm({
      message: (
        <p>
          {"Are you sure you want to install "}
          <b>{key}</b>?
        </p>
      ),
      labelCancel: "Cancel",
      labelOk: "Install",
    });

    if (!proceed) return;

    markMarketplaceInstalling(key);
    void install(entry).finally(() => clearMarketplaceInstalling(key));
  };

  // An update and a reinstall both put the version of the marketplace in place of the installed
  // one; the installer asks which of the two it is, after the download.
  const onUpdate = () => {
    if (!entry || !key) return;

    markMarketplaceUpdating(key);

    // The update uninstalls the old version before it installs the new one, so the extension
    // briefly leaves the installed list. The card stays updating until the new version is in.
    void install(entry)
      .then(() =>
        when(() => installedExtensionsByName.get().get(entry.packageName)?.manifest.version === entry.version.version, {
          timeout: 30_000,
        }).catch(() => undefined),
      )
      .finally(() => clearMarketplaceUpdating(key));
  };

  const toggle = (enable: boolean) => () => {
    if (!installed) return;

    (enable ? enableExtension : disableExtension)(installed.id).catch((error) =>
      showErrorNotification(
        `Failed to ${enable ? "enable" : "disable"} ${installed.manifest.name}: ${getMessageFromError(error)}`,
      ),
    );
  };

  return (
    <ExtensionCard
      entry={entry}
      installed={installed}
      installedSource={installed ? installedExtensionsState.get(installed.manifest.name)?.source : undefined}
      // A failure is only reported for an extension the user wants to run.
      loadFailures={installed?.isEnabled ? getLoadFailures(installed.id) : []}
      isInstalling={key ? isMarketplaceInstalling(key) : false}
      isUpdating={key ? isMarketplaceUpdating(key) : false}
      isUninstalling={installed ? extensionInstallationStateStore.isExtensionUninstalling(installed.id) : false}
      onInstall={() => void onInstall()}
      onUpdate={onUpdate}
      onReinstall={onUpdate}
      onUninstall={() => installed && void confirmUninstallExtension(installed)}
      onEnable={toggle(true)}
      onDisable={toggle(false)}
      isExpanded={props.isExpanded}
      onToggleExpanded={props.onToggleExpanded}
    />
  );
});

export const ConnectedExtensionCard = withInjectables<Dependencies, ConnectedExtensionCardProps>(
  NonInjectedConnectedExtensionCard,
  {
    getProps: (di, props) => {
      const extensionLoader = di.inject(extensionLoaderInjectable);

      return {
        ...props,
        installedExtensionsByName: di.inject(installedExtensionsByNameInjectable),
        installedExtensionsState: di.inject(installedExtensionsStateInjectable),
        marketplaceExtensions: di.inject(marketplaceExtensionsInjectable),
        installExtensionFromInput: di.inject(installExtensionFromInputInjectable),
        confirm: di.inject(confirmInjectable),
        confirmUninstallExtension: di.inject(confirmUninstallExtensionInjectable),
        extensionInstallationStateStore: di.inject(extensionInstallationStateStoreInjectable),
        enableExtension: di.inject(enableExtensionInjectable),
        disableExtension: di.inject(disableExtensionInjectable),
        showErrorNotification: di.inject(showErrorNotificationInjectable),
        getLoadFailures: (extensionId) => extensionLoader.getLoadFailures(extensionId),
      };
    },
  },
);
