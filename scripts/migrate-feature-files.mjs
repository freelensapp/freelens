#!/usr/bin/env node

/**
 * This script automatically updates feature.ts files to use explicit registration
 * Usage: node scripts/migrate-feature-files.mjs
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const packagesDir = join(rootDir, "packages");

/**
 * Check if a feature.ts file needs migration
 */
function needsMigration(content) {
  return content.includes("autoRegister") && content.includes("require.context");
}

/**
 * Transform feature.ts content from autoRegister to explicit registration
 */
function transformFeatureFile(content) {
  // Remove autoRegister import
  content = content.replace(
    /import\s+{\s*autoRegister\s*}\s+from\s+["']@ogre-tools\/injectable-extension-for-auto-registration["'];\s*/g,
    "",
  );

  // Add registerInjectables import
  if (!content.includes('from "./register-injectables"')) {
    // Find the last import statement
    const importMatch = content.match(/import[^;]+;/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      content = content.replace(
        lastImport,
        `${lastImport}\nimport { registerInjectables } from "./register-injectables";`,
      );
    }
  }

  // Replace autoRegister call with registerInjectables
  content = content.replace(
    /autoRegister\(\{[^}]+di,[^}]+targetModule:\s*module,[^}]+getRequireContexts:[^}]+\}\);/gs,
    "registerInjectables(di);",
  );

  return content;
}

/**
 * Find and migrate all feature.ts files
 */
async function findAndMigrateFeatures(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip certain directories
      if (["node_modules", "dist", "build", ".turbo", "coverage", "__mocks__"].includes(entry.name)) {
        continue;
      }
      await findAndMigrateFeatures(fullPath, results);
    } else if (entry.name === "feature.ts") {
      const content = await readFile(fullPath, "utf-8");

      if (needsMigration(content)) {
        const transformed = transformFeatureFile(content);
        await writeFile(fullPath, transformed);
        console.log(`✓ Migrated: ${fullPath}`);
        results.push(fullPath);
      } else {
        console.log(`  Skipped (already migrated): ${fullPath}`);
      }
    }
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  console.log("Searching for feature.ts files to migrate...\n");

  const migratedFiles = await findAndMigrateFeatures(packagesDir);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Summary: Migrated ${migratedFiles.length} feature files`);
  console.log(`${"=".repeat(60)}`);

  if (migratedFiles.length > 0) {
    console.log("\nMigrated files:");
    migratedFiles.forEach((f) => console.log(`  - ${f}`));
    console.log("\n⚠️  Please review the changes and test the build!");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
