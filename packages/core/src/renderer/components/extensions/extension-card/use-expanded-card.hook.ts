/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useState } from "react";

import type { ExtensionCardProps } from "./extension-card";

/**
 * One card of a list expanded at a time: expanding a card collapses the one
 * that was expanded, and a click on the expanded one collapses it.
 */
export const useExpandedCard = () => {
  const [expandedId, setExpandedId] = useState<string>();

  return (id: string): Pick<ExtensionCardProps, "isExpanded" | "onToggleExpanded"> => ({
    isExpanded: expandedId === id,
    onToggleExpanded: () => setExpandedId((current) => (current === id ? undefined : id)),
  });
};
