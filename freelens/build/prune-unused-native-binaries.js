/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const { access, readFile, readdir, rm, writeFile } = require("fs/promises");
const { constants } = require("fs");
const { createHash } = require("crypto");
const path = require("path");

const ELECTRON_BUILDER_ARCHES = {
  0: "ia32",
  1: "x64",
  2: "armv7l",
  3: "arm64",
};

function getArchName(arch) {
  if (typeof arch === "string") {
    return arch;
  }

  return ELECTRON_BUILDER_ARCHES[arch];
}

async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

async function getResourcesDir(context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName !== "darwin") {
    return path.join(appOutDir, "resources");
  }

  const entries = await readdir(appOutDir, { withFileTypes: true });
  const appBundle = entries.find((entry) => entry.isDirectory() && entry.name.endsWith(".app"));

  if (!appBundle) {
    throw new Error(`Could not find macOS app bundle in ${appOutDir}`);
  }

  return path.join(appOutDir, appBundle.name, "Contents", "Resources");
}

async function removeChildrenExcept(parentDir, keepName) {
  if (!(await pathExists(parentDir))) {
    return;
  }

  const entries = await readdir(parentDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.name !== keepName)
      .map((entry) =>
        rm(path.join(parentDir, entry.name), {
          force: true,
          recursive: true,
        }),
      ),
  );
}

async function removePnpmReflinkBinariesExcept(parentDir, keepPrefix) {
  if (!(await pathExists(parentDir))) {
    return;
  }

  const entries = await readdir(parentDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => entry.name.startsWith("reflink.") && entry.name.endsWith(".node"))
      .filter((entry) => !entry.name.startsWith(keepPrefix))
      .map((entry) =>
        rm(path.join(parentDir, entry.name), {
          force: true,
        }),
      ),
  );
}

/**
 * Recursively removes entries from the asar header's files tree for any
 * "unpacked" files or directories that no longer exist in .asar.unpacked.
 * Empty directory entries left behind are also removed.
 */
async function removeStaleUnpackedEntries(filesNode, currentUnpackedDir) {
  const keysToRemove = [];

  for (const [name, entry] of Object.entries(filesNode)) {
    const entryPath = path.join(currentUnpackedDir, name);

    if (typeof entry.files === "object") {
      // Directory entry
      if (entry.unpacked) {
        // Entire directory is marked as unpacked — check if it still exists on disk
        if (!(await pathExists(entryPath))) {
          keysToRemove.push(name);
        }
      } else {
        // Regular directory — recurse to check individual entries
        await removeStaleUnpackedEntries(entry.files, entryPath);
        // If all children were removed, clean up the now-empty directory entry
        if (Object.keys(entry.files).length === 0) {
          keysToRemove.push(name);
        }
      }
    } else if (entry.unpacked) {
      // Individual unpacked file — check if it still exists on disk
      if (!(await pathExists(entryPath))) {
        keysToRemove.push(name);
      }
    }
    // Inline files (no unpacked property) are stored inside the asar — leave them alone
  }

  for (const key of keysToRemove) {
    delete filesNode[key];
  }
}

/**
 * Reads the asar header, removes entries for any "unpacked" files that no
 * longer exist in .asar.unpacked, and writes the corrected header back.
 *
 * The asar binary format stores inline-file offsets relative to the start of
 * the file-data section (not the start of the file), so only the header needs
 * to be rewritten — the file-data section is appended unchanged.
 *
 * Asar binary layout:
 *   [sizeBuf (8 bytes)]  — Pickle<uint32> holding the byte length of headerBuf
 *   [headerBuf (N bytes)] — Pickle<string> holding the JSON header
 *   [file data section]   — concatenated inline file contents
 *
 * Pickle<uint32>:  [4 bytes payloadSize=4] [4 bytes value]
 * Pickle<string>:  [4 bytes payloadSize] [4 bytes stringLen] [stringLen bytes, 4-byte-aligned]
 *
 * Returns the old and new header SHA-256 hashes (hex) so the caller can update
 * the asar integrity metadata that electron-builder embedded *before* this hook
 * ran (see reconcileAsarIntegrity).  Returns null when nothing changed.
 */
async function reconcileAsarHeader(asarPath) {
  const unpackedDir = `${asarPath}.unpacked`;

  // Read the entire asar into memory
  const asarBuf = await readFile(asarPath);

  // Parse sizeBuf (bytes 0–7): bytes 4–7 hold the headerBuf byte length
  const headerBufLength = asarBuf.readUInt32LE(4);

  // Parse headerBuf (bytes 8 to 8+headerBufLength):
  //   bytes 8–11:  Pickle payloadSize (not needed for parsing)
  //   bytes 12–15: JSON string byte length
  //   bytes 16+:   JSON string
  const jsonLength = asarBuf.readUInt32LE(12);
  const oldJsonBuf = asarBuf.slice(16, 16 + jsonLength);
  const header = JSON.parse(oldJsonBuf.toString("utf8"));

  // Remove header entries for files pruned from .asar.unpacked
  if (header.files && typeof header.files === "object") {
    await removeStaleUnpackedEntries(header.files, unpackedDir);
  }

  // Re-encode the header JSON as a Pickle<string>
  const newJsonBuf = Buffer.from(JSON.stringify(header), "utf8");

  // Nothing was pruned — leave the asar (and its already-embedded integrity) untouched
  if (newJsonBuf.equals(oldJsonBuf)) {
    return null;
  }

  const newJsonLength = newJsonBuf.length;
  // Pickle aligns payload fields to 4-byte boundaries
  const newJsonAlignedLength = Math.ceil(newJsonLength / 4) * 4;
  const newPayloadSize = 4 + newJsonAlignedLength; // 4-byte length field + aligned JSON
  const newHeaderBuf = Buffer.alloc(4 + newPayloadSize, 0); // zero-initialised (handles padding)
  newHeaderBuf.writeUInt32LE(newPayloadSize, 0);
  newHeaderBuf.writeUInt32LE(newJsonLength, 4);
  newJsonBuf.copy(newHeaderBuf, 8);

  // Re-encode sizeBuf as a Pickle<uint32> holding the new headerBuf byte length
  const newSizeBuf = Buffer.alloc(8, 0);
  newSizeBuf.writeUInt32LE(4, 0); // Pickle payloadSize = 4
  newSizeBuf.writeUInt32LE(newHeaderBuf.length, 4);

  // The file-data section is unchanged; it immediately follows the original header
  const fileDataSection = asarBuf.slice(8 + headerBufLength);

  // Write the corrected asar
  await writeFile(asarPath, Buffer.concat([newSizeBuf, newHeaderBuf, fileDataSection]));

  // electron-builder embeds sha256(headerJson) as the asar integrity hash
  // (see app-builder-lib asar/integrity.js → hashHeader).
  return {
    oldHash: createHash("sha256").update(oldJsonBuf).digest("hex"),
    newHash: createHash("sha256").update(newJsonBuf).digest("hex"),
  };
}

/**
 * Replaces every occurrence of `search` with `replacement` (both equal-length
 * buffers) inside `buf`, in place.  Returns the number of replacements made.
 */
function replaceInBuffer(buf, search, replacement) {
  let count = 0;
  let index = buf.indexOf(search);

  while (index !== -1) {
    replacement.copy(buf, index);
    count += 1;
    index = buf.indexOf(search, index + replacement.length);
  }

  return count;
}

/**
 * electron-builder embeds the app.asar header hash as an integrity check
 * *before* the afterPack hook runs:
 *   - macOS:   ElectronAsarIntegrity in Contents/Info.plist
 *   - Windows: the INTEGRITY/ELECTRONASAR resource in the main .exe
 *   - Linux:   not embedded
 *
 * After reconcileAsarHeader rewrites the header, that embedded hash no longer
 * matches and Electron would refuse to launch if asar integrity validation is
 * enabled.  Both the old and new hashes are 64-character lowercase hex of the
 * same length, so the embedded value is patched in place (no change to file
 * size or PE/plist structure).  Signing happens after this hook, so the updated
 * bytes are covered by the signature.
 */
async function reconcileAsarIntegrity(context, resourcesDir, hashes) {
  const { electronPlatformName } = context;

  let targetFile;

  if (electronPlatformName === "darwin") {
    // resourcesDir is <bundle>.app/Contents/Resources; Info.plist sits next to it
    targetFile = path.join(resourcesDir, "..", "Info.plist");
  } else if (electronPlatformName === "win32") {
    const productFilename = context.packager.appInfo.productFilename;

    targetFile = path.join(context.appOutDir, `${productFilename}.exe`);
  } else {
    // Linux does not embed asar integrity
    return;
  }

  if (!(await pathExists(targetFile))) {
    return;
  }

  const buf = await readFile(targetFile);
  const replacements = replaceInBuffer(buf, Buffer.from(hashes.oldHash, "ascii"), Buffer.from(hashes.newHash, "ascii"));

  // No embedded hash found (e.g. asar integrity disabled) — nothing to reconcile
  if (replacements === 0) {
    return;
  }

  await writeFile(targetFile, buf);
}

exports.default = async function pruneUnusedNativeBinaries(context) {
  const archName = getArchName(context.arch);

  if (!archName) {
    return;
  }

  const resourcesDir = await getResourcesDir(context);
  const nodeModulesDir = path.join(resourcesDir, "app.asar.unpacked", "node_modules");
  const platformArch = `${context.electronPlatformName}-${archName}`;

  await removeChildrenExcept(path.join(nodeModulesDir, "node-pty", "prebuilds"), platformArch);
  await removePnpmReflinkBinariesExcept(path.join(nodeModulesDir, "pnpm", "dist"), `reflink.${platformArch}`);

  // After pruning files from .asar.unpacked, the app.asar header still lists the
  // deleted files as "unpacked", making the asar inconsistent.  Reconcile the header
  // so it only references files that actually exist in .asar.unpacked.
  const asarPath = path.join(resourcesDir, "app.asar");

  const hashes = await reconcileAsarHeader(asarPath);

  // Rewriting the header invalidates the asar integrity hash electron-builder
  // already embedded, so update it to match the reconciled header.
  if (hashes) {
    await reconcileAsarIntegrity(context, resourcesDir, hashes);
  }
};
