/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useState } from "react";
import extensionDiscoveryInjectable from "../../../extensions/extension-discovery/extension-discovery.injectable";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import { ConnectedExtensionCard } from "./extension-card/connected-extension-card";
import { useExpandedCard } from "./extension-card/use-expanded-card.hook";
import { getExtensionStatus } from "./extension-status";
import layoutStyles from "./extensions.module.scss";
import styles from "./installed-extensions.module.scss";
import marketplaceExtensionsInjectable from "./marketplace-extensions/marketplace-extensions.injectable";
import { SearchBar } from "./search-bar/search-bar";
import userExtensionsInjectable from "./user-extensions/user-extensions.injectable";

import type { IComputedValue } from "mobx";

import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { ExtensionDiscovery } from "../../../extensions/extension-discovery/extension-discovery";
import type { ExtensionLoadFailureInProcess } from "../../../extensions/extension-loader/load-failure";
import type { InstalledExtension, LensExtensionId } from "../../../extensions/installed-extension";
import type { MarketplaceExtension } from "./marketplace-extensions/marketplace-extensions.injectable";

export interface InstalledExtensionsProps {}

interface Dependencies {
  extensionDiscovery: ExtensionDiscovery;
  userExtensions: IComputedValue<InstalledExtension[]>;
  marketplaceExtensions: IAsyncComputed<MarketplaceExtension[]>;
  getLoadFailures: (extensionId: LensExtensionId) => ExtensionLoadFailureInProcess[];
}

/**
 * Every installed extension, the ones of the marketplace and the ones installed
 * from anywhere else, on the same cards as the marketplace.
 */
const NonInjectedInstalledExtensions = observer(
  ({ extensionDiscovery, userExtensions, marketplaceExtensions, getLoadFailures }: Dependencies) => {
    const [search, setSearch] = useState("");
    const expansionOf = useExpandedCard();

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

    const displayNames = new Map(
      marketplaceExtensions.value.get().map(({ packageName, displayName }) => [packageName, displayName]),
    );
    const titleOf = (extension: InstalledExtension) =>
      displayNames.get(extension.manifest.name) ?? extension.manifest.name;
    const query = search.toLowerCase();
    const matchedExtensions = extensions
      .filter((extension) =>
        [
          extension.manifest.name,
          titleOf(extension),
          extension.manifest.version,
          getExtensionStatus(extension, extension.isEnabled ? getLoadFailures(extension.id) : []),
        ].some((field) => field.toLowerCase().includes(query)),
      )
      .sort((left, right) => titleOf(left).localeCompare(titleOf(right)));

    return (
      <section data-testid="installed-extensions">
        <SearchBar value={search} onChange={setSearch} placeholder="Search Extensions..." />
        {matchedExtensions.length === 0 ? (
          <div className={styles.notFound}>No data found</div>
        ) : (
          <div className={layoutStyles.grid}>
            {matchedExtensions.map((extension) => (
              <ConnectedExtensionCard key={extension.id} installed={extension} {...expansionOf(extension.id)} />
            ))}
          </div>
        )}
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
        userExtensions: di.inject(userExtensionsInjectable),
        marketplaceExtensions: di.inject(marketplaceExtensionsInjectable),
        getLoadFailures: (extensionId) => extensionLoader.getLoadFailures(extensionId),
      };
    },
  },
);
