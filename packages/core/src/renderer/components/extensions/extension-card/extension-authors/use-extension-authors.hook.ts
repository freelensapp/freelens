/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useCallback, useState } from "react";

import type { MarketplaceExtensionAuthor } from "../../marketplace-extensions/marketplace-extensions.injectable";

export interface UseExtensionAuthorsArgs {
  authors: MarketplaceExtensionAuthor[];
}

export interface UseExtensionAuthorsResult {
  isPopoverOpen: boolean;
  handleDismiss: () => void;
  handleToggle: () => void;
  visible: MarketplaceExtensionAuthor[];
  remaining: number;
}

export const useExtensionAuthors = ({ authors }: UseExtensionAuthorsArgs): UseExtensionAuthorsResult => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleDismiss = useCallback(() => setIsPopoverOpen(false), []);
  const handleToggle = useCallback(() => setIsPopoverOpen((open) => !open), []);

  const visible = authors.slice(0, 2);
  const remaining = Math.max(0, authors.length - visible.length);

  return { isPopoverOpen, handleDismiss, handleToggle, visible, remaining };
};
