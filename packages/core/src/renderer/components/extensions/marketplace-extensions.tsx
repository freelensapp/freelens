/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { ExtensionCard } from "./extension-card";
import { ExtensionsGrid } from "./extensions-grid";
import marketplaceExtensionsInjectable from "./marketplace-extensions/marketplace-extensions.injectable";
import styles from "./marketplace-extensions.module.scss";
import { SearchBar } from "./search-bar";

import type { IComputedValue } from "mobx";

import type { MarketplaceExtension } from "./marketplace-extensions/marketplace-extensions.injectable";

export interface MarketplaceExtensionsProps {}

interface Dependencies {
  marketplaceExtensions: IComputedValue<MarketplaceExtension[]>;
}

const NonInjectedMarketplaceExtensions = observer(
  ({ marketplaceExtensions }: Dependencies & MarketplaceExtensionsProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const extensions = marketplaceExtensions.get();
    const filteredExtensions = extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleInstall = (extensionId: string) => {
      console.log(`Installing extension: ${extensionId}`);
      // TODO: Implement actual installation logic
    };

    return (
      <section data-testid="marketplace-extensions">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search Extensions..." />

        {filteredExtensions.length === 0 ? (
          <div className={`flex column h-full items-center justify-center ${styles.emptyState}`}>
            <Icon material="extension" className={styles.iconLarge} />
            <h3 className="font-medium text-2xl mb-2">No extensions found</h3>
            <p className={styles.emptyText}>Try a different search term</p>
          </div>
        ) : (
          <ExtensionsGrid>
            {filteredExtensions.map((extension) => (
              <ExtensionCard
                key={extension.id}
                variant="marketplace"
                id={extension.id}
                name={extension.name}
                description={extension.description}
                version={extension.version}
                onInstall={() => handleInstall(extension.id)}
              />
            ))}
          </ExtensionsGrid>
        )}
      </section>
    );
  },
);

export const MarketplaceExtensions = withInjectables<Dependencies, MarketplaceExtensionsProps>(
  NonInjectedMarketplaceExtensions,
  {
    getProps: (di, props) => ({
      ...props,
      marketplaceExtensions: di.inject(marketplaceExtensionsInjectable),
    }),
  },
);
