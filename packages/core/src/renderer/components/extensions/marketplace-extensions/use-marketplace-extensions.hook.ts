/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useMemo, useState } from "react";

import type { MarketplaceExtension } from "./marketplace-extensions.injectable";

export interface UseMarketplaceExtensionsResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filteredExtensions: MarketplaceExtension[];
}

export const useMarketplaceExtensions = (extensions: MarketplaceExtension[]): UseMarketplaceExtensionsResult => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExtensions = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return extensions.filter((extension) =>
      [extension.displayName, extension.packageName, extension.summary].some((text) =>
        text.toLowerCase().includes(query),
      ),
    );
  }, [extensions, searchQuery]);

  return { searchQuery, setSearchQuery, filteredExtensions };
};
