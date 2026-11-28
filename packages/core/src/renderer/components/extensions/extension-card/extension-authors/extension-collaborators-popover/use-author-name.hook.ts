/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useEffect, useRef, useState } from "react";

export interface UseAuthorNameArgs {
  name: string;
}

export interface UseAuthorNameResult {
  ref: React.RefObject<HTMLSpanElement | null>;
  needsTooltip: boolean;
}

export const useAuthorName = ({ name }: UseAuthorNameArgs): UseAuthorNameResult => {
  const ref = useRef<HTMLSpanElement>(null);
  const [needsTooltip, setNeedsTooltip] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (el) {
      setNeedsTooltip(el.scrollWidth > el.clientWidth);
    }
  }, [name]);

  return { ref, needsTooltip };
};
