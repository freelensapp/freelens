/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The most bytes a theme file may have, whether it is imported from a file or from a URL.
 */
export const maxThemeFileSize = 100 * 1024;

export const themeFileTooLargeError = "The theme file is larger than 100 KiB";

/**
 * The schemes a theme may be downloaded over.
 */
export const themeUrlProtocols: readonly string[] = ["https:", "http:"];

/**
 * Why `url` cannot be the URL of a theme to import, or `undefined` when it can.
 */
export const getThemeUrlError = (url: unknown): string | undefined => {
  if (typeof url !== "string") {
    return "The URL of a theme must be a string";
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return `${JSON.stringify(url)} is not a URL`;
  }

  if (!themeUrlProtocols.includes(parsed.protocol)) {
    return `A theme is downloaded over https: or http: only, not ${parsed.protocol}`;
  }

  return undefined;
};
