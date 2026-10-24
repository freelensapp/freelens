/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject, isString } from "@freelensapp/utilities";

import type { LensExtensionManifest } from "../../../../extensions/installed-extension";

export const manifestFilename = "package.json";

/**
 * The checks every install shape shares, whether the manifest came out of a
 * tarball or out of a directory registered in place.
 *
 * The name and the version are required here and not only by the loader,
 * because they are what the install path is built from.
 */
export function validateExtensionManifest(manifest: unknown): LensExtensionManifest {
  if (!isObject(manifest)) {
    throw new Error(`${manifestFilename} is not an object`);
  }

  if (!isString(manifest.name) || !manifest.name) {
    throw new Error(`${manifestFilename} must specify "name"`);
  }

  if (!isString(manifest.version) || !manifest.version) {
    throw new Error(`${manifestFilename} must specify "version"`);
  }

  if (!isString(manifest.main) && !isString(manifest.renderer)) {
    throw new Error(`${manifestFilename} must specify "main" and/or "renderer" field`);
  }

  if (!isObject(manifest.engines) || !isString(manifest.engines.freelens)) {
    throw new Error(`${manifestFilename} must specify "freelens" in "engines" field`);
  }

  return manifest as unknown as LensExtensionManifest;
}
