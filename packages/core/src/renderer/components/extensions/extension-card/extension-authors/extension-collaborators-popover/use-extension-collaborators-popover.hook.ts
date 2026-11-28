/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useEffect, useRef } from "react";

export interface UseExtensionCollaboratorsPopoverArgs {
  onDismiss: () => void;
}

export interface UseExtensionCollaboratorsPopoverResult {
  popoverRef: React.RefObject<HTMLDivElement | null>;
}

export const useExtensionCollaboratorsPopover = ({
  onDismiss,
}: UseExtensionCollaboratorsPopoverArgs): UseExtensionCollaboratorsPopoverResult => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (popoverRef.current && target && !popoverRef.current.contains(target)) {
        onDismiss();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onDismiss]);

  return { popoverRef };
};
