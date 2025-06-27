/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Make plural form for resource Kind
 */
export function lowerAndPluralize(str: string) {
  const lowerStr = str.toLowerCase();

  if (lowerStr.endsWith("y")) {
    return lowerStr.replace(/y$/, "ies");
  } else if (
    lowerStr.endsWith("s") ||
    lowerStr.endsWith("x") ||
    lowerStr.endsWith("z") ||
    lowerStr.endsWith("ch") ||
    lowerStr.endsWith("sh")
  ) {
    return lowerStr + "es";
  } else {
    return lowerStr + "s";
  }
}
