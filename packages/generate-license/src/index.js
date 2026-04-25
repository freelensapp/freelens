#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDependencies, getLicenseText } from "@quantco/pnpm-licenses/dist/api.mjs";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import spdxLicenseList from "spdx-license-list/full.js";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

function parseStoreDirFromModulesYaml(content) {
  try {
    const parsed = JSON.parse(content);

    if (parsed && typeof parsed.storeDir === "string" && parsed.storeDir.trim()) {
      return parsed.storeDir.trim();
    }
  } catch {
    // .modules.yaml can be YAML or JSON; use a text fallback when JSON parse fails.
  }

  const yamlMatch = content.match(/^\s*storeDir:\s*["']?(.+?)["']?\s*$/m);

  return yamlMatch?.[1]?.trim() ?? null;
}

async function detectStoreDirFromInstalledModules() {
  let currentDir = process.cwd();

  while (true) {
    const modulesYamlPath = path.join(currentDir, "node_modules", ".modules.yaml");

    try {
      const modulesYamlContent = await fs.readFile(modulesYamlPath, "utf8");
      const detectedStoreDir = parseStoreDirFromModulesYaml(modulesYamlContent);

      if (detectedStoreDir) {
        return detectedStoreDir;
      }
    } catch {
      // Keep walking up the directory tree.
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

async function detectPnpmStoreDir() {
  const detectedFromModules = await detectStoreDirFromInstalledModules();

  if (detectedFromModules) {
    return detectedFromModules;
  }

  const envStoreDir = process.env.npm_config_store_dir;

  if (envStoreDir?.trim()) {
    return envStoreDir.trim();
  }

  const { stdout: configStoreDir } = await execFileAsync("pnpm", ["config", "get", "store-dir", "--json"]);
  const parsedConfigStoreDir = JSON.parse(configStoreDir);

  if (typeof parsedConfigStoreDir === "string" && parsedConfigStoreDir.trim()) {
    return parsedConfigStoreDir.trim();
  }

  const { stdout: storePath } = await execFileAsync("pnpm", ["store", "path", "--silent"]);

  if (!storePath.trim()) {
    throw new Error("Could not detect pnpm store directory");
  }

  return storePath.trim();
}

async function getDependenciesUsingDetectedStoreDir(prod) {
  const storeDir = await detectPnpmStoreDir();
  const licensesArgs = [`--config.store-dir=${storeDir}`, "licenses", "list", "--json"];

  if (prod) {
    licensesArgs.splice(licensesArgs.length - 1, 0, "--prod");
  }

  const { stdout: dependenciesJson } = await execFileAsync("pnpm", licensesArgs, { maxBuffer: 1024 * 1024 * 64 });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "generate-license-"));
  const inputFile = path.join(tempDir, "dependencies.json");

  try {
    await fs.writeFile(inputFile, dependenciesJson, "utf8");

    return await getDependencies(
      { prod },
      {
        stdin: false,
        inputFile,
        stdout: true,
        outputFile: undefined,
      },
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const { outputFile, headerFile, prod } = parseArgs();
  const staticLicenses = {
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
  };

  const npmDependencies = await getDependenciesUsingDetectedStoreDir(prod);

  const fixedDepdencies = [];

  for (const d of npmDependencies) {
    if (d.license.match(" OR ")) {
      for (const l of d.license.replace(/^\(/, "").replace(/\)$/, "").split(" OR ")) {
        fixedDepdencies.push({ ...d, license: l });
      }
    } else {
      fixedDepdencies.push(d);
    }
  }

  const npmLicenses = {};

  for (const d of fixedDepdencies) {
    const key = `${d.name}:${d.license}`;
    let licenseText = "";
    try {
      licenseText = (await getLicenseText(d)).licenseText;
    } catch (_e) {
      console.warn(`Could not get license text for ${d.name}`, d);
      if (!staticLicenses[key]) {
        throw new Error(`Missing license text for ${d.name}`);
      }
      continue;
    }
    npmLicenses[key] = { name: d.name, author: d.author, licenseText };
  }

  const licenseContent = Object.entries({ ...staticLicenses, ...npmLicenses })
    .map(([k, v]) => `\n\n\n${v.name}\n\n${v.author ? `Copyright (c) ${v.author}.\n\n` : ""}${v.licenseText}`)
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
