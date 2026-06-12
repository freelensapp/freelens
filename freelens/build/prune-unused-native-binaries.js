/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const { access, readdir, rm } = require("fs/promises");
const { constants } = require("fs");
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
};
