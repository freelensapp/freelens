/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// node .github/scripts/test-report.mjs reports [jobs.tsv] [title] > report.md
//
// See "Test Reports" in AGENTS.md for the artifacts it reads and why the XML
// is treated as untrusted.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A comment has at most 65536 characters
const maxFailed = 50;
const maxMessage = 300;

const [directory, linksFile, title = "Tests"] = process.argv.slice(2);

if (!directory) {
  console.error("Usage: test-report.mjs <reports directory> [jobs.tsv] [title]");
  process.exit(2);
}

const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|amp);/gi, (entity, name) => {
    const named = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" }[name.toLowerCase()];

    if (named) {
      return named;
    }

    const code =
      name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);

    return Number.isSafeInteger(code) && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });

const attributes = (text) =>
  Object.fromEntries([...text.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, decode(value)]));

// Text from the XML goes into a code span of a table cell: GitHub renders neither
// Markdown, HTML nor a mention there, while an HTML entity or <code> would still
// let `@team` notify and `[text](url)` link. Its pipes are escaped, which GFM
// tables undo before the code span is parsed, and its fence is longer than any
// run of backticks in it.
const code = (text) => {
  const value = text.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");

  if (!value) return "";

  const fence = "`".repeat(Math.max(0, ...[...value.matchAll(/`+/g)].map(([run]) => run.length)) + 1);

  return `${fence} ${value} ${fence}`;
};

function readReport(path) {
  const counts = { tests: 0, failed: 0, skipped: 0 };
  const failures = [];
  let testcase;

  // Vitest writes the elements one per line, with their attributes in double quotes
  for (const [, closing, name, attrs] of readFileSync(path, "utf-8").matchAll(
    /<(\/?)(testsuite|testcase|failure|error)\b([^>]*)>/g,
  )) {
    if (closing) {
      if (name === "testcase") testcase = undefined;
      continue;
    }

    const values = attributes(attrs);

    if (name === "testsuite") {
      counts.tests += Number(values.tests) || 0;
      counts.failed += (Number(values.failures) || 0) + (Number(values.errors) || 0);
      counts.skipped += Number(values.skipped) || 0;
    } else if (name === "testcase") {
      testcase = values;
    } else if (testcase) {
      const message = (values.message ?? "").split("\n")[0];

      failures.push({
        file: testcase.classname ?? "",
        test: testcase.name ?? "",
        message: message.length > maxMessage ? `${message.slice(0, maxMessage)}…` : message,
      });
      // One row for a test, whatever number of failures it has
      testcase = undefined;
    }
  }

  return { counts, failures };
}

const urls = new Map();

if (linksFile) {
  for (const line of readFileSync(linksFile, "utf-8").split("\n")) {
    const [name, url] = line.split("\t");

    if (name && url) urls.set(name, url);
  }
}

const link = (job, text) => (urls.has(job) ? `[${text}](${urls.get(job)})` : text);

const isReport = (files) => files.includes("job.txt") || files.some((file) => file.endsWith(".xml"));
const entries = readdirSync(directory);

// download-artifact extracts each artifact into a directory of its own, except
// when its pattern matches a single one, which it extracts into the path itself
const reportDirectories = [
  ...(isReport(entries) ? [{ path: directory, name: "tests" }] : []),
  ...entries
    .filter((name) => name.startsWith("junit-") && statSync(join(directory, name)).isDirectory())
    .sort()
    .map((name) => ({ path: join(directory, name), name: name.slice("junit-".length) })),
];

const jobs = reportDirectories
  .map(({ path, name }) => {
    const files = readdirSync(path);
    const job = files.includes("job.txt") ? readFileSync(join(path, "job.txt"), "utf-8").trim() : name;
    const reports = files
      .filter((file) => file.endsWith(".xml"))
      .sort()
      .map((file) => readReport(join(path, file)));

    return {
      job,
      reported: reports.length > 0,
      counts: reports.reduce(
        (sum, { counts }) => ({
          tests: sum.tests + counts.tests,
          failed: sum.failed + counts.failed,
          skipped: sum.skipped + counts.skipped,
        }),
        { tests: 0, failed: 0, skipped: 0 },
      ),
      failures: reports.flatMap(({ failures }) => failures),
    };
  })
  .sort((left, right) => left.job.localeCompare(right.job, "en", { numeric: true }));

const lines = [`<!-- vitest-report: ${title} -->`, `### ${title}`, ""];

if (jobs.length === 0) {
  lines.push("No reports of the jobs.");
} else {
  lines.push("| Job | Tests | Passed ✅ | Skipped ⚠️ | Failed ❌ | |", "| :--- | ---: | ---: | ---: | ---: | :---: |");

  const totals = { tests: 0, passed: 0, skipped: 0, failed: 0 };
  let missing = false;

  for (const { job, reported, counts } of jobs) {
    if (!reported) {
      missing = true;
      lines.push(`| ${link(job, code(job))} | | | | | ❌ no report |`);
      continue;
    }

    const passed = counts.tests - counts.failed - counts.skipped;

    totals.tests += counts.tests;
    totals.passed += passed;
    totals.skipped += counts.skipped;
    totals.failed += counts.failed;
    lines.push(
      `| ${link(job, code(job))} | ${counts.tests} | ${passed} | ${counts.skipped} | ${counts.failed} | ${counts.failed ? "❌" : "✅"} |`,
    );
  }

  lines.push(
    `| **All** | **${totals.tests}** | **${totals.passed}** | **${totals.skipped}** | **${totals.failed}** | ${totals.failed || missing ? "❌" : "✅"} |`,
  );

  const failed = jobs.flatMap(({ job, failures }) => failures.map((failure) => ({ job, ...failure })));

  if (failed.length > 0) {
    lines.push("", "| Job | File | Test | Message |", "| :--- | :--- | :--- | :--- |");

    for (const { job, file, test, message } of failed.slice(0, maxFailed)) {
      lines.push(`| ${link(job, code(job))} | ${code(file)} | ${code(test)} | ${code(message)} |`);
    }

    if (failed.length > maxFailed) {
      lines.push("", `And ${failed.length - maxFailed} more.`);
    }
  }
}

const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repository, REPORT_RUN_ID: run } = process.env;

if (server && repository && run) {
  lines.push("", `[The run of the workflow](${server}/${repository}/actions/runs/${run})`);
}

console.log(lines.join("\n"));
