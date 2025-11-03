#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDependencies, getLicenseText } from "@quantco/pnpm-licenses/dist/api.mjs";
import fs from "fs/promises";
import spdxLicenseList from "spdx-license-list/full.js";

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

  const npmDependencies = await getDependencies(
    { prod },
    {
      stdin: false,
      inputFile: undefined,
      stdout: true,
      outputFile: undefined,
    },
  );

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
