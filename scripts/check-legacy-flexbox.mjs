/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Ratchet guardrail for the legacy flexbox.scss -> Tailwind migration
// (see docs/v2-styling.md and issue #2145).
//
// It counts occurrences of the legacy in-house flexbox utility vocabulary
// (`.flex`, `.column`, `.gaps`, `.box`, `.grow`, `.align-center`, ...) in the
// class-list string literals of core's TSX (both `className="..."` and helper
// calls such as `cssNames("flex box grow", ...)`). The count is compared to a
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

// Legacy tokens with a unique spelling that only flexbox.scss produces — no
// Tailwind utility or common component class shares the name. Always counted.
const ALWAYS_LEGACY = new Set([
  "box",
  "gaps",
  "column",
  "fullsize",
  "grow-fixed",
  "wrap-reverse",
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
  "content-stretch",
  "self-flex-start",
  "self-flex-end",
]);

// Legacy child utilities (`.flex > .box.grow`, `.box.center`, ...). Their
// spelling collides with Tailwind utilities (`grow`, `self-stretch`, ...), so
// they are counted only when the same className still carries `box` — a
// migrated className drops `box`, which is what lets the ratchet reach zero.
const CHILD_LEGACY = new Set(["grow", "center", "left", "right", "self-stretch", "self-baseline", "self-center"]);

// Legacy parent modifiers (`.flex.inline`, `.flex.center`, ...). Counted only
// when the className carries `flex`. Their migrated Tailwind equivalents are
// spelled differently (`inline-flex`, `flex-row-reverse`, `items-center`), so
// this does not count migrated code.
const PARENT_LEGACY = new Set(["inline", "reverse", "wrap", "auto", "center"]);

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
  const hasFlex = tokens.includes("flex");
  const hasBox = tokens.includes("box");
  let count = 0;
  for (const token of tokens) {
    if (ALWAYS_LEGACY.has(token)) {
      count += 1;
    } else if (hasBox && CHILD_LEGACY.has(token)) {
      count += 1;
    } else if (hasFlex && PARENT_LEGACY.has(token)) {
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
