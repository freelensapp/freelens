/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const developmentPrefix = "dev-";

/**
 * The URL segment standing for one load of a development extension.
 *
 * A managed build puts `<version>-<digest8>` in that position, which changes
 * exactly when the content does, so the module map -- keyed by URL and never
 * evicted within a realm -- caches for exactly as long as it should. A
 * development install has neither: its directory is registered in place and its
 * content changes without any version bump, so the position carries a token
 * instead.
 *
 * The token is minted per *load*, not per request. One token covers the whole
 * module graph of a load, because a relative import inside the extension
 * resolves against the URL it was imported from: a token that changed per
 * request would give each of those a distinct URL and instantiate the same
 * module more than once.
 *
 * Nothing rotates it yet -- reloading a rebuilt development extension is a
 * separate change -- but the URL shape is settled here so that change only has
 * to decide *when* a new token is minted.
 */
export function developmentBuildSegment(token: string): string {
  return `${developmentPrefix}${token}`;
}

export function isDevelopmentBuildSegment(segment: string): boolean {
  return segment.startsWith(developmentPrefix) && segment.length > developmentPrefix.length;
}
