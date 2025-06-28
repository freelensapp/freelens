/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject, isString, listTarEntries, readFileFromTar } from "@freelensapp/utilities";
import path from "path";
import { manifestFilename } from "../../../../extensions/extension-discovery/extension-discovery";

import type { LensExtensionManifest } from "@freelensapp/legacy-extensions";

export async function validatePackage(filePath: string): Promise<LensExtensionManifest> {
  console.log("validatePackage");
  console.log({ filePath });
  const tarFiles = await listTarEntries(filePath);

  // tarball from npm contains single root folder "package/*"
  const firstFile = tarFiles[0];

  if (!firstFile) {
    throw new Error(`invalid extension bundle, ${manifestFilename} not found`);
  }

  const rootFolder = path.normalize(firstFile).split(path.sep)[0];
  const packedInRootFolder = tarFiles.every((entry) => entry.startsWith(rootFolder));
  const manifestLocation = packedInRootFolder ? path.join(rootFolder, manifestFilename) : manifestFilename;

  if (!tarFiles.includes(manifestLocation)) {
    throw new Error(`invalid extension bundle, ${manifestFilename} not found`);
  }

  const manifest = await readFileFromTar({
    tarPath: filePath,
    filePath: manifestLocation,
    parseJson: true,
  });

  console.log({ manifest });

  if (!isObject(manifest) || (!isString(manifest.main) && !isString(manifest.renderer))) {
    throw new Error(`${manifestFilename} must specify "main" and/or "renderer" field`);
  }

  if (!isObject(manifest.engines) || !isString(manifest.engines.freelens)) {
    throw new Error(`${manifestFilename} must specify "freelens" in "engines" field`);
  }

  return manifest as unknown as LensExtensionManifest;
}
