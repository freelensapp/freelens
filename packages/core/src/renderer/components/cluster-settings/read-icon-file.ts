/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Reads a picked image as the data URL that `ClusterPreferences.icon` keeps for
 * an uploaded icon.
 */
export function readIconFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Cannot read ${file.name}`));
    reader.readAsDataURL(file);
  });
}
