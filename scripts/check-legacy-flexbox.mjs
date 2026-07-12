/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Ratchet guardrail for the legacy flexbox.scss -> Tailwind migration
// (see docs/v2-styling.md and issue #2145).
//
// It counts occurrences of the legacy in-house flexbox utility vocabulary
// (`.flex`, `.column`, `.gaps`, `.box`, `.grow`, `.align-center`, ...) inside
// `className` attributes across core's TSX. The count is compared against a
// committed baseline (`scripts/legacy-flexbox-baseline.json`) and the check
// fails when the count *increases*. This stops new mixed classnames from
// landing while first-party usage is migrated to Tailwind, one batch at a
// time. When a batch lowers the count, run this script with `--update` to
// ratchet the baseline down.
//
// Usage:
//   node scripts/check-legacy-flexbox.mjs            # verify against baseline
//   node scripts/check-legacy-flexbox.mjs --update   # rewrite the baseline

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const scanRoot = path.join(repoRoot, "packages", "core", "src");
const baselineFile = path.join(repoRoot, "scripts", "legacy-flexbox-baseline.json");

// Legacy tokens that do not exist in Tailwind's vocabulary. These are always
// counted because they can only come from flexbox.scss.
const UNAMBIGUOUS_LEGACY = new Set([
  "gaps",
  "align-center",
  "align-flex-start",
  "align-flex-end",
  "align-stretch",
  "align-baseline",
  "justify-flex-start",
  "justify-flex-end",
  "justify-space-between",
  "justify-space-around",
  "content-flex-start",
  "content-flex-end",
  "content-space-between",
  "content-space-around",
  "grow-fixed",
  "self-flex-start",
  "self-flex-end",
  "self-stretch",
  "self-baseline",
  "wrap-reverse",
]);

// Legacy tokens whose spelling collides with unrelated component classes or
// Tailwind utilities (e.g. `center`, `grow`, `column`). They are only counted
// when the same `className` is a flexbox context, i.e. it also carries the
// `flex` or `box` token.
const CONTEXTUAL_LEGACY = new Set([
  "box",
  "grow",
  "column",
  "reverse",
  "inline",
  "fullsize",
  "auto",
  "center",
  "left",
  "right",
  "wrap",
  "self-center",
]);

/** Recursively collect *.tsx files under a directory. */
function collectTsx(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "__snapshots__") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectTsx(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

// Matches double-quoted and backtick string literals. Legacy flexbox classes
// live both directly in `className="..."` and inside helper calls such as
// `cssNames("flex box grow", ...)`, so every string literal is examined and a
// literal is only counted when it looks like a class list (see
// countInClassName). Template expressions (${...}) do not tokenize into legacy
// words. Single-quoted literals are skipped: they are almost always import
// specifiers here and never carry class lists.
const STRING_LITERAL_RE = /"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;

/** Count legacy tokens inside a single className string. */
function countInClassName(value) {
  const tokens = value.split(/\s+/).filter(Boolean);
  const isFlexContext = tokens.includes("flex") || tokens.includes("box");
  let count = 0;
  for (const token of tokens) {
    if (UNAMBIGUOUS_LEGACY.has(token)) {
      count += 1;
    } else if (isFlexContext && CONTEXTUAL_LEGACY.has(token)) {
      count += 1;
    }
  }
  return count;
}

function scan() {
  const files = collectTsx(scanRoot, []);
  const perFile = {};
  let total = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    let fileCount = 0;
    for (const match of source.matchAll(STRING_LITERAL_RE)) {
      const value = match[1] ?? match[2] ?? "";
      fileCount += countInClassName(value);
    }
    if (fileCount > 0) {
      perFile[path.relative(repoRoot, file)] = fileCount;
      total += fileCount;
    }
  }
  return { total, perFile };
}

const { total, perFile } = scan();
const shouldUpdate = process.argv.includes("--update");

if (shouldUpdate) {
  const baseline = {
    comment:
      "Ratchet baseline for the legacy flexbox -> Tailwind migration. This number may only decrease. See scripts/check-legacy-flexbox.mjs and docs/v2-styling.md.",
    total,
    files: perFile,
  };
  writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Updated legacy flexbox baseline: ${total} occurrences.`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
} catch {
  console.error(
    `Cannot read baseline ${path.relative(repoRoot, baselineFile)}. Run: node scripts/check-legacy-flexbox.mjs --update`,
  );
  process.exit(1);
}

if (total > baseline.total) {
  console.error(
    `Legacy flexbox usage increased: ${total} occurrences (baseline ${baseline.total}).\n` +
      "New code must use Tailwind layout utilities instead of flexbox.scss classes.\n" +
      "See docs/v2-styling.md for the migration mapping.",
  );
  process.exit(1);
}

if (total < baseline.total) {
  console.log(
    `Legacy flexbox usage decreased to ${total} (baseline ${baseline.total}). ` +
      "Ratchet the baseline down with: node scripts/check-legacy-flexbox.mjs --update",
  );
  process.exit(0);
}

console.log(`Legacy flexbox usage unchanged at ${total} occurrences.`);
process.exit(0);
