/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";

/**
 * The `<extensionsRoot>/<directory>` an install belongs to, or `undefined` when
 * the path is outside the root.
 *
 * Every decision to delete goes through this: an install whose path is outside
 * the managed root was registered in place, and is not ours to remove.
 */
export function managedDirectoryOf(extensionsRoot: string, installPath: string): string | undefined {
  const relativePath = path.relative(extensionsRoot, installPath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return undefined;
  }

  const [directoryName] = relativePath.split(/[\\/]/);

  return directoryName ? path.join(extensionsRoot, directoryName) : undefined;
}
