/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useEffect, useRef, useState } from "react";

import type { MarketplaceExtensionAuthor } from "../../marketplace-extensions/marketplace-extensions.injectable";

export interface UseAuthorItemArgs {
  author: MarketplaceExtensionAuthor;
  disabled?: boolean;
  hasLinks: boolean;
}

export interface UseAuthorItemResult {
  isHovered: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

export const useAuthorItem = ({ disabled, hasLinks }: UseAuthorItemArgs): UseAuthorItemResult => {
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(hideTimeoutRef.current), []);

  const handleMouseEnter = () => {
    clearTimeout(hideTimeoutRef.current);

    if (!disabled && hasLinks) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    // keep the tooltip open briefly so the mouse has time to reach it
    hideTimeoutRef.current = setTimeout(() => setIsHovered(false), 60);
  };

  return { isHovered, handleMouseEnter, handleMouseLeave };
};
