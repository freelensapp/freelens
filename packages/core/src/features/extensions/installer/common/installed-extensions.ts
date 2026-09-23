/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import z from "zod";

/**
 * Where an extension came from. The source is recorded rather than re-derived
 * because the argument the user gave is not recoverable from the install: a
 * package name and a tarball URL both end up as an extracted tree.
 */
export const installedExtensionSourceModel = z.discriminatedUnion("kind", [
  /**
   * A package name, resolved against a registry. The version is the concrete
   * one resolved at install time, so that a later tag move does not silently
   * change what counts as installed.
   */
  z.object({ kind: z.literal("registry"), name: z.string(), version: z.string() }),
  z.object({ kind: z.literal("url"), url: z.string() }),
  z.object({ kind: z.literal("file"), path: z.string() }),
  /**
   * A directory, registered in place. This is the development mode: the
   * extension is not copied, is not verifiable, and must never be deleted on
   * uninstall.
   */
  z.object({ kind: z.literal("directory"), path: z.string() }),
]);

export const installedExtensionEntryModel = z.object({
  /** The extension's manifest name, which is also its `LensExtensionId`. */
  name: z.string(),
  /**
   * Absolute path to the live build: the `<version>-<digest8>` directory of a
   * managed install, or the registered directory of a development install.
   *
   * This is what tells the host which build is current when several are still
   * on disk, because deletion of the previous one is deferred.
   */
  path: z.string(),
  /** The concrete version installed. Absent for a development install. */
  version: z.string().optional(),
  /** The first eight hex characters of the tarball's sha256. */
  digest: z.string().optional(),
  source: installedExtensionSourceModel,
  /**
   * Whether the tarball was checked against a checksum at install time.
   * Verification happens at install and is not repeated at load, so this is a
   * record of what was done, not a claim about the tree on disk now.
   */
  verified: z.boolean(),
});

export type InstalledExtensionSource = z.infer<typeof installedExtensionSourceModel>;
export type InstalledExtensionEntry = z.infer<typeof installedExtensionEntryModel>;

/**
 * A development install is registered in place, so its path is arbitrary and
 * outside the managed root. Everything that deletes has to ask this first.
 */
export function isExternalEntry(entry: InstalledExtensionEntry): boolean {
  return entry.source.kind === "directory";
}
