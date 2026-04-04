/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./beta-badge.scss";

import React from "react";
import { Badge } from "./badge";

export type BetaBadgeVariant = "outline" | "solid" | "contrast";

export interface BetaBadgeProps {
  variant?: BetaBadgeVariant;
  className?: string;
}

export const BetaBadge = ({ variant = "outline", className }: BetaBadgeProps) => {
  const classes = ["BetaBadge", `BetaBadge--${variant}`, className].filter(Boolean).join(" ");

  return <Badge small flat className={classes} label="Beta" />;
};
