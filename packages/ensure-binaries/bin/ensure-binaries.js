#!/usr/bin/env node

async function main() {
  await import("../dist/index.mjs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
