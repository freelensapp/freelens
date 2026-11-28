/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { ConnectedExtensionCard } from "../extension-card/connected-extension-card";
import { useExpandedCard } from "../extension-card/use-expanded-card.hook";
import layoutStyles from "../extensions.module.scss";
import { SearchBar } from "../search-bar/search-bar";
import marketplaceExtensionsInjectable from "./marketplace-extensions.injectable";
import styles from "./marketplace-extensions.module.scss";
import { useMarketplaceExtensions } from "./use-marketplace-extensions.hook";

import type { IAsyncComputed } from "../../../../common/utils/async-computed";
import type { MarketplaceExtension } from "./marketplace-extensions.injectable";

interface Dependencies {
  marketplaceExtensions: IAsyncComputed<MarketplaceExtension[]>;
}

const NonInjectedMarketplaceExtensions = observer(({ marketplaceExtensions }: Dependencies) => {
  const { searchQuery, setSearchQuery, filteredExtensions } = useMarketplaceExtensions(
    marketplaceExtensions.value.get(),
  );
  const expansionOf = useExpandedCard();

  const isPending = marketplaceExtensions.pending.get();

  // The first download, or a refresh of a list that has nothing to show yet. A refresh of a list
  // that has cards keeps them, and turns the refresh button instead.
  if (isPending && marketplaceExtensions.value.get().length === 0) {
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

  return (
    <section data-testid="marketplace-extensions">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search Extensions..."
        actions={
          <Icon
            material="refresh"
            interactive
            role="button"
            aria-label="Refresh the marketplace"
            tooltip="Refresh the marketplace"
            disabled={isPending}
            className={cssNames(styles.refresh, { [styles.refreshing]: isPending })}
            onClick={() => marketplaceExtensions.invalidate()}
            data-testid="marketplace-refresh"
          />
        }
      />
      {filteredExtensions.length === 0 ? (
        <div className={`flex column h-full items-center justify-center ${styles.emptyState}`}>
          <Icon material="extension" className={styles.iconLarge} />
          <h3 className="font-medium text-2xl mb-2">No extensions found</h3>
          <p className={styles.emptyText}>Try a different search term</p>
        </div>
      ) : (
        <div className={layoutStyles.grid}>
          {filteredExtensions.map((extension) => (
            <ConnectedExtensionCard key={extension.id} entry={extension} {...expansionOf(extension.id)} />
          ))}
        </div>
      )}
    </section>
  );
});

export const MarketplaceExtensions = withInjectables<Dependencies>(NonInjectedMarketplaceExtensions, {
  getProps: (di) => ({
    marketplaceExtensions: di.inject(marketplaceExtensionsInjectable),
  }),
});
