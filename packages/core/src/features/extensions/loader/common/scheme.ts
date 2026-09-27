/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The privileged scheme main serves extension files over, and the shape of the
 * URLs the renderer imports from it.
 *
 * There is **one origin for every extension**, with the extension in the path:
 *
 * ```text
 * freelens-extension://extensions/<sanitized-name>/<build-segment>/<file>
 * ```
 *
 * The boundary this draws is extensions-versus-application, not
 * extension-versus-extension. An origin per extension would advertise an
 * isolation we cannot guarantee -- with `contextIsolation: false` extension
 * code already runs with full privileges -- and would not even give import
 * isolation, since a cross-origin module import succeeds from a `corsEnabled`
 * scheme with no CORS header at all.
 *
 * Because the name is a path segment rather than a host, the `.` and `_` which
 * npm package names allow need no further sanitising than
 * {@link sanitizeExtensionName} already does.
 */
export const extensionScheme = "freelens-extension";

/**
 * The single host every extension URL uses. It is not an extension identity:
 * see {@link extensionScheme}.
 */
export const extensionSchemeHost = "extensions";

export const extensionSchemeOrigin = `${extensionScheme}://${extensionSchemeHost}`;

export interface ExtensionFileRequest {
  /** The extension's manifest name, as {@link sanitizeExtensionName} spells it. */
  sanitizedName: string;
  /**
   * Which load of the extension the URL belongs to: `<version>-<digest8>` for a
   * managed build, an opaque per-load token for a development install.
   */
  buildSegment: string;
  /** The file below the extension's directory, as `/`-separated segments. */
  fileSegments: string[];
}

const encodeSegment = (segment: string): string => encodeURIComponent(segment);

/**
 * Split a path taken from a manifest (`dist/renderer.js`, `./out/index.js`)
 * into URL segments, so that a Windows-style separator or a leading `./` does
 * not reach the URL.
 */
export function toFileSegments(filePath: string): string[] {
  return filePath.split(/[\\/]/).filter((segment) => segment !== "" && segment !== ".");
}

export function extensionFileUrl({ sanitizedName, buildSegment, fileSegments }: ExtensionFileRequest): string {
  const path = [sanitizedName, buildSegment, ...fileSegments].map(encodeSegment).join("/");

  return `${extensionSchemeOrigin}/${path}`;
}

/**
 * The inverse of {@link extensionFileUrl}, and the first gate of the handler:
 * anything which is not exactly this shape is refused rather than resolved.
 *
 * A segment which is empty, `.` or `..` after decoding is rejected here, so
 * traversal never reaches the filesystem. That is a cheap check and not the
 * containment one -- a symlink inside an extension still has to be resolved
 * against the extension's root.
 */
export function parseExtensionFileUrl(url: string): ExtensionFileRequest | undefined {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== `${extensionScheme}:` || parsed.host !== extensionSchemeHost) {
    return undefined;
  }

  const segments: string[] = [];

  for (const rawSegment of parsed.pathname.split("/")) {
    if (rawSegment === "") {
      continue;
    }

    let segment: string;

    try {
      segment = decodeURIComponent(rawSegment);
    } catch {
      return undefined;
    }

    if (segment === "." || segment === ".." || segment.includes("\0") || /[\\/]/.test(segment)) {
      return undefined;
    }

    segments.push(segment);
  }

  const [sanitizedName, buildSegment, ...fileSegments] = segments;

  if (!sanitizedName || !buildSegment || fileSegments.length === 0) {
    return undefined;
  }

  return { sanitizedName, buildSegment, fileSegments };
}

/**
 * What the response says a file is.
 *
 * This is load-bearing rather than cosmetic: a module served with the wrong
 * `Content-Type` fails the import outright, measured on Electron 42.7.1. The
 * unknown case maps to `application/octet-stream`, which correctly refuses to
 * execute.
 */
const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".cjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".eot": "application/vnd.ms-fontobject",
  ".gif": "image/gif",
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/vnd.microsoft.icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export const fallbackContentType = "application/octet-stream";

export function contentTypeForFile(fileName: string): string {
  const extension = /\.[^.]*$/.exec(fileName)?.[0]?.toLowerCase();

  return (extension && contentTypes[extension]) || fallbackContentType;
}
