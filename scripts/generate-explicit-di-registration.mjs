#!/usr/bin/env node

/**
 * This script generates explicit DI registration files to replace webpack's auto-registration
 * Usage: node scripts/generate-explicit-di-registration.mjs
 *
 * Handles:
 * - Simple packages: single register-injectables.ts at package root
 * - Core package: per-directory register-injectables.ts files
 * - Multiple export patterns: default, named, destructuring, multi-export
 * - Special root directories: common/ and extensions/
 */

import { spawn } from "node:child_process";
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const packagesDir = join(rootDir, "packages");

/**
 * Find all .injectable.ts and .injectable.tsx files in a directory (recursive)
 */
async function findInjectableFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        ["node_modules", "dist", "build", ".turbo", "coverage", "__mocks__", "test-data", "__tests__"].includes(
          entry.name,
        )
      ) {
        continue;
      }
      files.push(...(await findInjectableFiles(fullPath, baseDir)));
    } else if (entry.isFile() && /\.injectable\.(ts|tsx)$/.test(entry.name)) {
      files.push(relative(baseDir, fullPath));
    }
  }

  return files;
}

/**
 * Find injectable files in a single directory (non-recursive)
 */
async function findInjectableFilesInDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isFile() && /\.injectable\.(ts|tsx)$/.test(entry.name)) {
      files.push(entry.name);
    }
  }

  return files;
}

/**
 * Recursively find all directories containing injectable files
 */
async function findDirectoriesWithInjectables(dir, baseDir = dir, dirs = new Set()) {
  const entries = await readdir(dir, { withFileTypes: true });
  let hasInjectables = false;

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        ["node_modules", "dist", "build", ".turbo", "coverage", "__mocks__", "test-data", "__tests__"].includes(
          entry.name,
        )
      ) {
        continue;
      }
      await findDirectoriesWithInjectables(fullPath, baseDir, dirs);
    } else if (entry.isFile() && /\.injectable\.(ts|tsx)$/.test(entry.name)) {
      hasInjectables = true;
    }
  }

  if (hasInjectables) {
    const relativePath = relative(baseDir, dir);
    dirs.add(relativePath || ".");
  }

  return dirs;
}

/**
 * Recursively check if a directory supports a specific process type
 * A directory supports a process if:
 * 1. It has a direct process-specific subdirectory (main/ or renderer/), OR
 * 2. It has no process-specific subdirectories at all (truly shared), OR
 * 3. All its child directories that have register-injectables.ts support the process
 */
async function supportsProcess(dir, processType) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    // Check for direct process subdirectories
    const hasProcessDir = entries.some((e) => e.isDirectory() && e.name === processType);
    const oppositeProcess = processType === "main" ? "renderer" : "main";
    const hasOppositeDir = entries.some((e) => e.isDirectory() && e.name === oppositeProcess);

    // If it has the process we want, it's supported
    if (hasProcessDir) {
      return true;
    }

    // If it only has the opposite process, it's NOT supported
    if (hasOppositeDir && !hasProcessDir) {
      return false;
    }

    // Check all subdirectories that have registration files
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "main" || entry.name === "renderer") continue;

      const childPath = join(dir, entry.name);
      const hasRegisterFile = await stat(join(childPath, "register-injectables.ts"))
        .then(() => true)
        .catch(() => false);

      if (hasRegisterFile) {
        // Recursively check if this child supports the process
        const childSupports = await supportsProcess(childPath, processType);
        if (!childSupports) {
          // If any child with registration doesn't support the process, neither does the parent
          return false;
        }
      }
    }

    // If no process subdirectories and all children support it (or no children), it's supported
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique import name from a relative path
 * Example: "features/vars/build-version" -> "FeaturesVarsBuildVersion"
 */
function generateImportName(relativePath) {
  return relativePath
    .split("/")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/-./g, (x) => x[1].toUpperCase()))
    .join("");
}

/**
 * Recursively find all process-specific registration files
 * Returns array of {path, importName} objects
 */
async function findProcessSpecificRegistrations(dir, processType, basePath = "") {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Skip opposite process type directories to prevent cross-contamination
    // e.g., when looking for "main" registrations, skip "renderer" directories
    const oppositeProcessType = processType === "main" ? "renderer" : "main";
    if (entry.name === oppositeProcessType) {
      continue;
    }

    const fullPath = join(dir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    // Skip opposite process directories - they should never be included in this process
    const oppositeProcess = processType === "main" ? "renderer" : "main";
    if (entry.name === oppositeProcess) {
      continue;
    }

    // Check if this directory has a process-specific subdirectory with registration
    const processSpecificPath = join(fullPath, processType, "register-injectables.ts");
    let hasProcessSpecific = false;
    try {
      await stat(processSpecificPath);
      // Found a process-specific registration - generate import name from full path
      const importName = generateImportName(relativePath);
      results.push({
        path: `${relativePath}/${processType}/register-injectables`,
        importName: `register${importName}${processType.charAt(0).toUpperCase() + processType.slice(1)}Injectables`,
      });
      hasProcessSpecific = true;
    } catch {
      // No process-specific registration found
    }

    // Check for shared registration (independent of whether process-specific exists)
    const sharedRegisterPath = join(fullPath, "register-injectables.ts");
    try {
      await stat(sharedRegisterPath);

      // Check if this entire directory tree supports the target process
      const directorySupports = await supportsProcess(fullPath, processType);

      // Only include shared registration if the directory supports the process
      if (directorySupports) {
        const importName = generateImportName(relativePath);
        results.push({
          path: `${relativePath}/register-injectables`,
          importName: `register${importName}Injectables`,
        });

        // The shared aggregator handles all shared subdirectories, BUT we still need to
        // check for process-specific registrations (paths with /main/ or /renderer/)
        // because those are NOT aggregated by the shared register-injectables
        const nested = await findProcessSpecificRegistrations(fullPath, processType, relativePath);
        const processSpecificNested = nested.filter((reg) => reg.path.includes(`/${processType}/register-injectables`));
        results.push(...processSpecificNested);

        continue;
      }

      // If shared aggregator doesn't support this process, recurse to find children that do
      // (only if we haven't already processed this via process-specific)
      if (!hasProcessSpecific) {
        const nested = await findProcessSpecificRegistrations(fullPath, processType, relativePath);
        results.push(...nested);
      }
    } catch {
      // No shared registration, recurse if we haven't already via process-specific
      if (!hasProcessSpecific) {
        const nested = await findProcessSpecificRegistrations(fullPath, processType, relativePath);
        results.push(...nested);
      }
    }
  }

  // Deduplicate by path
  const uniqueResults = [];
  const seenPaths = new Set();
  for (const result of results) {
    if (!seenPaths.has(result.path)) {
      seenPaths.add(result.path);
      uniqueResults.push(result);
    }
  }

  return uniqueResults;
}

/**
 * Generate root registration file (main.ts or renderer.ts) for core package
 */
async function generateRootRegistration(srcDir, type, generatedFiles) {
  const entries = await readdir(srcDir, { withFileTypes: true });
  const imports = [];
  const calls = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = join(srcDir, entry.name);

    // Check top-level directories that might have registrations
    if (entry.name === type || entry.name === "common" || entry.name === "extensions" || entry.name === "features") {
      if (entry.name === "features") {
        // For features, recursively find process-specific registrations
        const featureRegistrations = await findProcessSpecificRegistrations(fullPath, type, "features");
        for (const reg of featureRegistrations) {
          // Prefix feature imports with "Features" to avoid conflicts with top-level directories
          const featureImportName = reg.importName.replace(/^register/, "registerFeatures");
          imports.push(`import { registerInjectables as ${featureImportName} } from "./${reg.path}";`);
          calls.push(`  ${featureImportName}(di);`);
        }
      } else {
        // For other top-level directories, look for direct registration file
        const registerPath = join(fullPath, "register-injectables.ts");
        try {
          await stat(registerPath);
          const capitalizedName = entry.name.charAt(0).toUpperCase() + entry.name.slice(1);
          imports.push(
            `import { registerInjectables as register${capitalizedName}Injectables } from "./${entry.name}/register-injectables";`,
          );
          calls.push(`  register${capitalizedName}Injectables(di);`);
        } catch {
          // No register file in this dir
        }
      }
    }
  }

  if (imports.length === 0) {
    console.log(`No ${type} registration needed`);
    return;
  }

  const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated by scripts/generate-explicit-di-registration.mjs
 *
 * Root registration file for ${type} process.
 */

${imports.join("\n")}

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
${calls.join("\n")}
}
`;

  const outputPath = join(srcDir, `register-injectables-${type}.ts`);
  await writeFile(outputPath, content);
  console.log(`✓ Generated ${type}/register-injectables.ts`);
  generatedFiles.push(outputPath);
}

/**
 * Extract export info from an injectable file
 * Returns array of export info objects (to handle multiple exports)
 */
async function extractExportInfo(filePath) {
  const content = await readFile(filePath, "utf-8");

  // Check for: export default anything;
  const defaultExportMatch = content.match(/export\s+default\s+(\w+);/);
  if (defaultExportMatch) {
    const exportName = defaultExportMatch[1];
    // Skip if the exported identifier ends with InjectionToken
    // These are DI tokens, not injectables
    if (exportName.endsWith("InjectionToken")) {
      return null;
    }
    return [{ name: exportName, isDefault: true }];
  }

  // Check for destructured exports: export const { foo, bar } = ...
  const destructuredMatch = content.match(/export\s+const\s+\{([^}]+)\}\s*=/);
  if (destructuredMatch) {
    const names = destructuredMatch[1]
      .split(",")
      .map((name) => {
        const trimmed = name.trim();
        if (trimmed.includes(":")) {
          return trimmed.split(":")[1].trim();
        }
        return trimmed;
      })
      .filter((name) => name.length > 0);

    const allInjectables = names.every((name) => name.endsWith("Injectable"));
    if (allInjectables && names.length > 0) {
      return names.map((name) => ({ name, isDefault: false }));
    }
    return null;
  }

  // Check for multiple export const statements
  const exportConstMatches = [...content.matchAll(/export\s+const\s+(\w+)\s*=/g)];
  if (exportConstMatches.length > 1) {
    const filteredExports = exportConstMatches
      .map((match) => match[1])
      .filter((name) => !name.endsWith("InjectionToken"))
      .map((name) => ({ name, isDefault: false }));
    return filteredExports.length > 0 ? filteredExports : null;
  }

  // Check for single export const
  if (exportConstMatches.length === 1) {
    const exportName = exportConstMatches[0][1];
    // Skip if the exported identifier ends with InjectionToken
    if (exportName.endsWith("InjectionToken")) {
      return null;
    }
    if (content.includes("export default")) {
      return [{ name: exportName, isDefault: true }];
    }
    return [{ name: exportName, isDefault: false }];
  }

  // Check for export { ... } syntax
  const multiExportMatch = content.match(/export\s+\{([^}]+)\}/);
  if (multiExportMatch) {
    const names = multiExportMatch[1]
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        if (trimmed.includes(" as ")) {
          return trimmed.split(" as ")[1].trim();
        }
        return trimmed;
      })
      .filter((name) => name.length > 0 && name !== "default");

    if (names.length > 0) {
      return names.map((name) => ({ name, isDefault: false }));
    }
  }

  return null;
}

/**
 * Generate registration file content
 */
function generateRegistrationFile(imports, registrations) {
  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated by scripts/generate-explicit-di-registration.mjs
 *
 * This file explicitly registers all injectables for this package.
 * This replaces the webpack-based auto-registration system.
 */

${imports.join("\n")}

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
${registrations.map((r) => `  try { di.register(${r}); } catch (e) { /* Ignore duplicate registration */ }`).join("\n")}
}
`;
}

/**
 * Check if a package is the core package (needs special per-directory handling)
 */
function isCorePackage(packageName) {
  return packageName === "@freelensapp/core";
}

/**
 * Generate aggregator files for directories that have subdirectories with registration files
 */
async function generateAggregatorFiles(srcDir, allDirs, generatedFiles) {
  const processedDirs = new Set();

  // Add all parent directories that might need aggregators
  const allDirsWithParents = new Set(allDirs);
  for (const dir of allDirs) {
    if (dir === ".") continue;
    let currentPath = dir;
    while (currentPath.includes("/")) {
      currentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
      allDirsWithParents.add(currentPath);
    }
  }

  // Sort directories by depth (deepest first) so we build aggregators bottom-up
  const sortedDirs = Array.from(allDirsWithParents).sort((a, b) => {
    const depthA = a === "." ? 0 : a.split("/").length;
    const depthB = b === "." ? 0 : b.split("/").length;
    return depthB - depthA;
  });

  // Helper function to recursively check if directory has any shared registration files
  async function hasAnySharedRegistration(dirPath) {
    // Check if current directory has a shared registration file
    const hasSharedFile = await stat(join(dirPath, "register-injectables.ts"))
      .then(() => true)
      .catch(() => false);

    if (hasSharedFile) return true;

    // Check subdirectories
    const entries = await readdir(dirPath, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Skip main/ and renderer/ as they're not shared
      if (entry.name === "main" || entry.name === "renderer") continue;

      const subdirPath = join(dirPath, entry.name);
      if (await hasAnySharedRegistration(subdirPath)) {
        return true;
      }
    }

    return false;
  }

  for (const dir of sortedDirs) {
    if (dir === ".") continue; // Skip root

    const fullDir = join(srcDir, dir);

    // Find subdirectories by actually reading the directory
    const subdirs = [];
    const entries = await readdir(fullDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const subdirName = entry.name;

      // Skip process-specific subdirectories in shared aggregators
      if (subdirName === "main" || subdirName === "renderer") continue;

      const childPath = join(fullDir, subdirName);

      // Check if this subdirectory has ANY shared registration files (recursively)
      const hasShared = await hasAnySharedRegistration(childPath);

      // Skip if it has NO shared registration at any level
      if (!hasShared) {
        continue;
      }

      subdirs.push(subdirName);
    }

    if (subdirs.length === 0) continue;

    // This directory needs an aggregator file
    if (processedDirs.has(dir)) continue;
    processedDirs.add(dir);

    subdirs.sort();

    const imports = [];
    const calls = [];

    for (const subdir of subdirs) {
      // Convert directory name to PascalCase for identifier (handle -, ., and other non-alphanumeric chars)
      const capitalizedName = subdir
        .split(/[-.\s_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
      imports.push(
        `import { registerInjectables as register${capitalizedName}Injectables } from "./${subdir}/register-injectables";`,
      );
      calls.push(
        `  try { register${capitalizedName}Injectables(di); } catch (e) { /* Ignore duplicate registration */ }`,
      );
    }

    // Also check for injectable files directly in this directory
    const files = await findInjectableFilesInDir(fullDir);
    if (files.length > 0) {
      // There are injectables in this directory itself, we need to include them
      const directImports = [];
      const directRegistrations = [];
      const usedNames = new Set();

      // Sort files to ensure consistent ordering
      files.sort();

      for (const file of files) {
        const fullPath = join(fullDir, file);
        const exportInfos = await extractExportInfo(fullPath);
        if (!exportInfos) continue;

        const importPath = "./" + file.replace(/\.tsx?$/, "");
        for (const exportInfo of exportInfos) {
          const exportName = exportInfo.name;
          let localName = exportName;

          // Handle name conflicts by creating unique aliases
          if (usedNames.has(exportName)) {
            // Create alias from file name to ensure uniqueness
            // e.g., preferences-route-component-for-legacy-extensions.injectable.ts -> preferencesRouteComponentForLegacyExtensions
            const fileBaseName = file.replace(/\.(ts|tsx)$/, "").replace(/\.injectable$/, "");
            localName =
              fileBaseName.charAt(0).toUpperCase() + fileBaseName.slice(1).replace(/-./g, (x) => x[1].toUpperCase());

            if (exportInfo.isDefault) {
              directImports.push(`import ${localName} from "${importPath}";`);
            } else {
              directImports.push(`import { ${exportName} as ${localName} } from "${importPath}";`);
            }
            directRegistrations.push(localName);
          } else {
            if (exportInfo.isDefault) {
              directImports.push(`import ${exportName} from "${importPath}";`);
            } else {
              directImports.push(`import { ${exportName} } from "${importPath}";`);
            }
            directRegistrations.push(localName);
            usedNames.add(exportName);
          }
        }
      }

      directImports.sort();
      directRegistrations.sort();

      // Add direct registrations to the imports and calls
      imports.unshift(...directImports);
      calls.unshift(
        ...directRegistrations.map(
          (name) => `  try { di.register(${name}); } catch (e) { /* Ignore duplicate registration */ }`,
        ),
      );
    }

    const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated by scripts/generate-explicit-di-registration.mjs
 *
 * This file imports and registers all injectables from subdirectories.
 * This replaces the webpack-based auto-registration system.
 */

${imports.join("\n")}

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
${calls.join("\n")}
}
`;

    const outputPath = join(fullDir, "register-injectables.ts");
    await writeFile(outputPath, content);
    generatedFiles.push(outputPath);
    console.log(`  ✓ Generated aggregator ${dir}/register-injectables.ts`);
  }
}

/**
 * Process core package with per-directory registration
 */
async function processCorePackage(packagePath) {
  const packageJsonPath = join(packagePath, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
  const packageName = packageJson.name;

  console.log(`\nProcessing core package: ${packageName} (per-directory mode)`);

  const srcDir = join(packagePath, "src");

  // Find all directories with injectable files
  const dirs = await findDirectoriesWithInjectables(srcDir, srcDir);
  console.log(`Found ${dirs.size} directories with injectables\n`);

  let totalInjectables = 0;
  const generatedFiles = [];

  // Process each directory
  for (const dir of Array.from(dirs).sort()) {
    const fullDir = dir === "." ? srcDir : join(srcDir, dir);
    const files = await findInjectableFilesInDir(fullDir);

    if (files.length === 0) continue;

    console.log(`Processing ${dir || "root"}/ (${files.length} files)`);

    const imports = [];
    const registrations = [];
    const seenNames = new Set();

    for (const file of files) {
      const fullPath = join(fullDir, file);
      const exportInfos = await extractExportInfo(fullPath);

      if (!exportInfos) continue;

      const importPath = "./" + file.replace(/\.tsx?$/, "");

      // Handle multiple exports from one file
      for (const exportInfo of exportInfos) {
        let exportName = exportInfo.name;

        // Handle duplicate names
        if (seenNames.has(exportName)) {
          let counter = 2;
          const originalName = exportName;
          while (seenNames.has(exportName)) {
            exportName = `${originalName}${counter}`;
            counter++;
          }
          console.log(`  ⚠️  Renaming duplicate ${originalName} to ${exportName} (from ${file})`);
        }

        seenNames.add(exportName);

        if (exportInfo.isDefault) {
          imports.push(`import ${exportName} from "${importPath}";`);
        } else {
          if (exportName !== exportInfo.name) {
            imports.push(`import { ${exportInfo.name} as ${exportName} } from "${importPath}";`);
          } else {
            imports.push(`import { ${exportName} } from "${importPath}";`);
          }
        }

        registrations.push(exportName);
      }
    }

    imports.sort();
    registrations.sort();

    const content = generateRegistrationFile(imports, registrations);
    const outputPath = join(fullDir, "register-injectables.ts");
    await writeFile(outputPath, content);
    generatedFiles.push(outputPath);

    console.log(`  ✓ Generated register-injectables.ts`);
    totalInjectables += registrations.length;
  }

  // Generate aggregator files for directories with subdirectories
  await generateAggregatorFiles(srcDir, dirs, generatedFiles);

  // Generate main and renderer root registration files
  await generateRootRegistration(srcDir, "main", generatedFiles);
  await generateRootRegistration(srcDir, "renderer", generatedFiles);

  // Delete old single registration file if it exists (from old generation method)
  const oldRegistrationFile = join(srcDir, "register-injectables.ts");
  try {
    await unlink(oldRegistrationFile);
    console.log("✓ Deleted old register-injectables.ts (using per-directory mode)");
  } catch {
    // File doesn't exist, which is fine
  }

  return {
    packageName,
    packagePath,
    injectableCount: totalInjectables,
    generatedFiles,
  };
}

/**
 * Process a regular package with single registration file
 */
async function processRegularPackage(packagePath) {
  const packageJsonPath = join(packagePath, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
  const packageName = packageJson.name;

  console.log(`\nProcessing package: ${packageName}`);

  const srcDir = join(packagePath, "src");
  try {
    await stat(srcDir);
  } catch {
    console.log(`  No src directory, skipping`);
    return null;
  }

  const injectableFiles = await findInjectableFiles(srcDir);

  if (injectableFiles.length === 0) {
    console.log(`  No injectable files found`);
    return null;
  }

  console.log(`  Found ${injectableFiles.length} injectable files`);

  const imports = [];
  const registrations = [];

  for (const file of injectableFiles) {
    const fullPath = join(srcDir, file);
    const exportInfos = await extractExportInfo(fullPath);

    if (!exportInfos) continue;

    const importPath = "./" + file.replace(/\.tsx?$/, "");

    for (const exportInfo of exportInfos) {
      if (exportInfo.isDefault) {
        imports.push(`import ${exportInfo.name} from "${importPath}";`);
      } else {
        imports.push(`import { ${exportInfo.name} } from "${importPath}";`);
      }
      registrations.push(exportInfo.name);
    }
  }

  imports.sort();
  registrations.sort();

  const registrationContent = generateRegistrationFile(imports, registrations);
  const outputPath = join(srcDir, "register-injectables.ts");

  await writeFile(outputPath, registrationContent);
  console.log(`  ✓ Generated ${outputPath}`);

  return {
    packageName,
    packagePath,
    injectableCount: injectableFiles.length,
    generatedFiles: [outputPath],
  };
}

/**
 * Recursively find all packages (directories with package.json)
 */
async function findAllPackages(dir, packages = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Skip these directories
    if (["node_modules", "dist", "build", ".turbo", "coverage", "__mocks__"].includes(entry.name)) {
      continue;
    }

    const fullPath = join(dir, entry.name);
    const pkgJsonPath = join(fullPath, "package.json");

    try {
      await stat(pkgJsonPath);
      // This directory has a package.json
      packages.push(fullPath);
    } catch {
      // No package.json, recurse into subdirectories
      await findAllPackages(fullPath, packages);
    }
  }

  return packages;
}

/**
 * Run biome:fix on generated files
 */
async function runBiomeFix(generatedFiles) {
  if (generatedFiles.length === 0) return;

  console.log(`\nRunning biome:fix on ${generatedFiles.length} generated files...`);

  // On Windows, batch files to avoid ENAMETOOLONG (32KB command-line limit)
  // On Linux/macOS, process all files at once (much higher limits)
  if (process.platform === "win32") {
    const batchSize = 100;

    for (let i = 0; i < generatedFiles.length; i += batchSize) {
      const batch = generatedFiles.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(generatedFiles.length / batchSize);

      console.log(`  Processing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

      await new Promise((resolve, reject) => {
        const biome = spawn("pnpm", ["--silent", "biome:fix", ...batch], {
          cwd: rootDir,
          stdio: "inherit",
        });

        biome.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Biome exited with code ${code}`));
          }
        });

        biome.on("error", reject);
      });
    }
  } else {
    // Linux/macOS: process all files in one go
    await new Promise((resolve, reject) => {
      const biome = spawn("pnpm", ["--silent", "biome:fix", ...generatedFiles], {
        cwd: rootDir,
        stdio: "inherit",
      });

      biome.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Biome exited with code ${code}`));
        }
      });

      biome.on("error", reject);
    });
  }

  console.log("✓ Biome formatting completed\n");
}

/**
 * Process all packages
 */
async function processAllPackages() {
  console.log("Finding all packages...\n");
  const packagePaths = await findAllPackages(packagesDir);

  console.log(`Found ${packagePaths.length} packages\n`);

  const results = [];
  const allGeneratedFiles = [];

  for (const packagePath of packagePaths) {
    // Check if this is the core package
    const packageJsonPath = join(packagePath, "package.json");
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
      const isCore = isCorePackage(packageJson.name);

      const result = isCore ? await processCorePackage(packagePath) : await processRegularPackage(packagePath);

      if (result) {
        results.push(result);
        allGeneratedFiles.push(...result.generatedFiles);
      }
    } catch (err) {
      console.error(`Error processing ${packagePath}:`, err.message);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Summary:");
  console.log(`Processed ${results.length} packages`);
  console.log(`Total injectables: ${results.reduce((sum, r) => sum + r.injectableCount, 0)}`);
  console.log(`Generated ${allGeneratedFiles.length} registration files`);
  console.log(`${"=".repeat(60)}\n`);

  // Run biome:fix on all generated files
  await runBiomeFix(allGeneratedFiles);
}

// Run the script
processAllPackages().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
