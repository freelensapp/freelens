# Scripts

Repository scripts that the build, the checks or a developer run directly.

## generate-explicit-di-registration.mjs

Generates the `register-injectables.ts` files that register every injectable
with the dependency-injection container.

```bash
pnpm build:di
```

Run it after adding, moving or renaming an injectable file. The build runs it
too. See "Dependency Injection System" in `AGENTS.md` for how the generated
files are organised.

## type-check-environments.mjs

Runs the main and renderer type-check programs and counts only the errors in
each program's own files.

```bash
pnpm type:check:environments
```

`type-check-environments/` holds the legacy lists and the expected-failure
files the check uses. See "Runtime Environments in Type-Checking" in
`AGENTS.md`.

## vite-plugin-standard-decorators.mjs

A Vite plugin that lowers standard decorators, which MobX 7 requires and Oxc
passes through. `freelens/electron.vite.config.ts` and `vitest.config.ts` load
it.

## knip-install-missing-packages.sh

Adds every package that knip reports as unlisted to the dependencies, and as
development dependencies the ones it reports outside production code.

```bash
scripts/knip-install-missing-packages.sh
```

Review the resulting `package.json` changes before committing them.
