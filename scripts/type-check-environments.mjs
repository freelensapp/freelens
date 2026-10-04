#!/usr/bin/env node
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Type-checks the application sources once per runtime environment:
// tsconfig.main.json (Node, no DOM) and tsconfig.renderer.json (DOM, no Node).
// See "Runtime Environments in Type-Checking" in AGENTS.md.
//
// `tsc` alone cannot enforce these programs, for two reasons:
//
// - It reports errors in every file of a program, and a program holds every
//   file its root files import, including the other environment's files and
//   other packages. Only errors in the program's own root files, the files its
//   `include` classifies into that environment, count here. Every file is still
//   checked in full by the combined program, tsconfig.typecheck.json.
// - Files that break their environment's rules today are on the legacy lists
//   in type-check-environments/legacy.jsonc. Their errors are tolerated, and
//   a listed file that no longer has any fails the check until it is removed
//   from the list, so the lists only ever shrink.
//
// It also keeps biome.jsonc in step with the renderer legacy list: the files
// exempted there from `noNodejsModules` must be on that list, so the
// exemptions shrink with it.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const legacyListsFile = join(import.meta.dirname, "type-check-environments", "legacy.jsonc");
const biomeConfigFile = join(root, "biome.jsonc");
const tsc = join(dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin", "tsc");

const programs = [
  { name: "main", config: "tsconfig.main.json" },
  { name: "renderer", config: "tsconfig.renderer.json" },
];

function runTsc(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsc, ...args], { cwd: root });
    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({ code, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() }),
    );
  });
}

// JSONC: drop comments outside strings, then trailing commas.
function parseJsonc(text) {
  const withoutComments = text.replace(
    /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (_match, string) => string ?? "",
  );

  return JSON.parse(withoutComments.replace(/,(\s*[\]}])/g, "$1"));
}

// `tsc --pretty false` prints one diagnostic per line, `file(line,col): error TSnnnn: message`,
// with further lines of the same message indented. A diagnostic without a file
// (a configuration error, for example) has no location prefix.
function parseDiagnostics(output) {
  const diagnostics = [];

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;

    if (/^\s/.test(line) && diagnostics.length > 0) {
      diagnostics.at(-1).text += `\n${line}`;
      continue;
    }

    const match = /^(.+?)\(\d+,\d+\): error TS\d+:/.exec(line);

    diagnostics.push({
      file: match ? relative(root, join(root, match[1])).replaceAll("\\", "/") : undefined,
      text: line,
    });
  }

  return diagnostics;
}

async function checkProgram({ name, config }, legacyFiles) {
  const problems = [];
  const shown = await runTsc(["-p", config, "--showConfig"]);

  if (shown.code !== 0) {
    return { problems: [`${config}: tsc --showConfig failed\n${shown.stdout}${shown.stderr}`] };
  }

  const rootFiles = new Set(JSON.parse(shown.stdout).files.map((file) => file.replace(/^\.\//, "")));
  const checked = await runTsc(["-p", config, "--pretty", "false"]);

  if (checked.stderr.trim()) {
    problems.push(`${config}: tsc wrote to stderr\n${checked.stderr}`);
  }

  const diagnostics = parseDiagnostics(checked.stdout);
  const legacy = new Set(legacyFiles);
  const legacyWithErrors = new Set();
  let ignored = 0;

  for (const diagnostic of diagnostics) {
    if (diagnostic.file === undefined) {
      problems.push(diagnostic.text);
    } else if (!rootFiles.has(diagnostic.file)) {
      ignored++;
    } else if (legacy.has(diagnostic.file)) {
      legacyWithErrors.add(diagnostic.file);
    } else {
      problems.push(diagnostic.text);
    }
  }

  if (checked.code !== 0 && diagnostics.length === 0) {
    problems.push(`${config}: tsc exited with code ${checked.code} without reporting a diagnostic\n${checked.stdout}`);
  }

  for (const file of legacy) {
    if (!rootFiles.has(file)) {
      problems.push(`${file}: on the "${name}" legacy list but not in ${config}; remove it from the list`);
    } else if (!legacyWithErrors.has(file)) {
      problems.push(
        `${file}: on the "${name}" legacy list but has no ${name} errors any more; remove it from the list`,
      );
    }
  }

  const summary = `${name}: ${rootFiles.size} files, ${legacy.size} on the legacy list, ${ignored} errors outside its own files ignored`;

  return { problems, summary };
}

// The Biome override that turns `noNodejsModules` off exempts renderer and
// common files that import a Node builtin today. Each of them also fails the
// renderer program, so an exemption that is not on the renderer legacy list is
// either stale or new, and neither is allowed. The exemptions start with
// `**/`, which Biome needs when Trunk runs it from a sandbox outside the
// repository; the legacy list is root-relative, so the prefix is dropped for
// the comparison.
function checkBiomeExemptions(rendererLegacyFiles) {
  const legacy = new Set(rendererLegacyFiles);
  const overrides = parseJsonc(readFileSync(biomeConfigFile, "utf8")).overrides ?? [];
  const exempted = overrides
    .filter((override) => override.linter?.rules?.correctness?.noNodejsModules === "off")
    .flatMap((override) => override.includes ?? []);

  return exempted.flatMap((include) => {
    if (!include.startsWith("**/")) {
      return [`${include}: exemption in biome.jsonc does not start with "**/", so it does not apply under Trunk Check`];
    }

    if (!legacy.has(include.slice(3))) {
      return [
        `${include}: exempted from noNodejsModules in biome.jsonc but not on the "renderer" legacy list; remove the exemption`,
      ];
    }

    return [];
  });
}

const legacyLists = parseJsonc(readFileSync(legacyListsFile, "utf8"));
const results = await Promise.all(programs.map((program) => checkProgram(program, legacyLists[program.name] ?? [])));
let failed = false;

for (const [index, { problems, summary }] of results.entries()) {
  if (summary) console.log(summary);

  if (problems.length > 0) {
    failed = true;
    console.error(`\n${programs[index].config}: ${problems.length} problem(s)\n`);

    for (const problem of problems) console.error(problem);
  }
}

const biomeProblems = checkBiomeExemptions(legacyLists.renderer ?? []);

if (biomeProblems.length > 0) {
  failed = true;
  console.error(`\nbiome.jsonc: ${biomeProblems.length} problem(s)\n`);

  for (const problem of biomeProblems) console.error(problem);
}

if (failed) {
  console.error(
    '\nA new type error here means the code uses an API its environment does not have: Node in renderer code, DOM in main code, either in common code. See "Runtime Environments in Type-Checking" in AGENTS.md.',
  );
  process.exit(1);
}
