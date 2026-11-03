/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Themes register alphabetically by file, which says nothing about how a list
// of them should read: the themes "Sync with computer" picks come first, and
// the others keep their order after them.
export const sortThemesForDisplay = <Theme extends { readonly isSystemTheme?: boolean }>(
  themes: readonly Theme[],
): Theme[] =>
  [...themes].sort((left, right) => Number(right.isSystemTheme ?? false) - Number(left.isSystemTheme ?? false));
