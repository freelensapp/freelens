#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getDependencies, getLicenseText } from "@quantco/pnpm-licenses/dist/api.mjs";
import spdxLicenseList from "spdx-license-list/full.js";

type Dependency = Awaited<ReturnType<typeof getDependencies>>[number];

interface LicenseEntry {
  name: string;
  author?: string;
  licenseText: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  const headerIndex = args.indexOf("--header");
  const hasProd = args.includes("--prod");

  return {
    outputFile: outputIndex !== -1 && args[outputIndex + 1] ? args[outputIndex + 1] : null,
    headerFile: headerIndex !== -1 && args[headerIndex + 1] ? args[headerIndex + 1] : null,
    prod: hasProd,
  };
}

async function getDependenciesFromPnpmApi(prod: boolean) {
  const previousStoreDir = process.env.npm_config_store_dir;

  if (previousStoreDir?.trim()) {
    process.env.npm_config_store_dir = await normalizeStoreDir(previousStoreDir.trim());
  }

  try {
    return await getDependencies(
      { prod },
      {
        stdin: false,
        inputFile: undefined,
        stdout: true,
        outputFile: undefined,
      },
    );
  } finally {
    if (previousStoreDir === undefined) {
      delete process.env.npm_config_store_dir;
    } else {
      process.env.npm_config_store_dir = previousStoreDir;
    }
  }
}

async function findProjectTopDir() {
  let currentDir = process.cwd();

  while (true) {
    const workspaceConfigPath = path.join(currentDir, "pnpm-workspace.yaml");

    try {
      await fs.access(workspaceConfigPath);

      return currentDir;
    } catch {
      // Keep walking up the directory tree.
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return process.cwd();
    }

    currentDir = parentDir;
  }
}

function getSpdxLicenseText(license: string): string | null {
  const ids = license
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(/ AND | OR /)
    .map((id) => id.trim());

  const texts: string[] = [];

  for (const id of ids) {
    const entry = spdxLicenseList[id];

    if (!entry) {
      return null;
    }

    texts.push(entry.licenseText);
  }

  return texts.join("\n\n");
}

async function normalizeStoreDir(storeDir: string) {
  if (path.isAbsolute(storeDir)) {
    return storeDir;
  }

  const projectTopDir = await findProjectTopDir();

  return path.resolve(projectTopDir, storeDir);
}

async function main() {
  const { outputFile, headerFile, prod } = parseArgs();
  const staticLicenses: Record<string, LicenseEntry> = {
    "kubectl:Apache-2.0": {
      name: "kubectl",
      author: "The Kubernetes Authors",
      licenseText: spdxLicenseList["Apache-2.0"].licenseText,
    },
    "helm:Apache-2.0": {
      name: "helm",
      author: "The Helm Authors",
      licenseText: spdxLicenseList["Apache-2.0"].licenseText,
    },
    // `await-lock` is vendored as TypeScript into
    // `packages/core/src/common/utils/await-lock.ts` (see #2209), so it is no
    // longer an npm dependency and must be listed here to keep its copyright in
    // the generated license manifest.
    "await-lock:MIT": {
      name: "await-lock",
      author: "James Ide",
      licenseText: spdxLicenseList.MIT.licenseText,
    },
  };

  const npmDependencies = await getDependenciesFromPnpmApi(prod);

  const fixedDepdencies: Dependency[] = [];

  for (const d of npmDependencies) {
    if (d.license.match(" OR ")) {
      for (const l of d.license.replace(/^\(/, "").replace(/\)$/, "").split(" OR ")) {
        fixedDepdencies.push({ ...d, license: l });
      }
    } else {
      fixedDepdencies.push(d);
    }
  }

  const npmLicenses: Record<string, LicenseEntry> = {};

  for (const d of fixedDepdencies) {
    const key = `${d.name}:${d.license}`;
    let licenseText = "";
    try {
      licenseText = (await getLicenseText(d)).licenseText;
    } catch (_e) {
      console.warn(`Could not get license text for ${d.name}`, d);

      const spdxLicenseText = getSpdxLicenseText(d.license);

      if (spdxLicenseText) {
        npmLicenses[key] = { name: d.name, author: d.author, licenseText: spdxLicenseText };
        continue;
      }

      if (!staticLicenses[key]) {
        throw new Error(`Missing license text for ${d.name}`);
      }
      continue;
    }
    npmLicenses[key] = { name: d.name, author: d.author, licenseText };
  }

  const licenseContent = Object.entries({ ...staticLicenses, ...npmLicenses })
    .map(([_k, v]) => `\n\n\n${v.name}\n\n${v.author ? `Copyright (c) ${v.author}.\n\n` : ""}${v.licenseText}`)
    .join("");

  let finalContent = licenseContent;

  if (headerFile) {
    const headerContent = await fs.readFile(headerFile, "utf8");
    finalContent = headerContent + licenseContent;
  }

  if (outputFile) {
    await fs.writeFile(outputFile, finalContent, "utf8");
  } else {
    console.log(finalContent);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
