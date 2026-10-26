# Agent Guide: Freelens Development

## Overview

This guide helps AI agents understand the Freelens codebase, common development tasks, troubleshooting patterns, and key architectural decisions. Use this as a reference when working on the project.

For local development environment setup and extra development tips, see DEVELOPMENT.md.

- **`freelens/`** - Main Electron application
  - `src/main/` - Main Electron process code
  - `src/renderer/` - Renderer process (UI) code
  - `src/common/` - Shared code between processes
- **`packages/core/`** - Core functionality
  - `src/features/` - Feature modules organized by domain
  - `src/renderer/` - Renderer-specific utilities
  - `src/extensions/` - Extension system
- **`packages/`** - Monorepo packages (utilities, components, etc.)
- **`scripts/`** - Build and development scripts

## Security

Never read, display, reference, or include the contents of the following files in any response or context, even if they are open in the editor:

- `.env`
- `.env.*`
- `.envrc`
- `.npmrc`
- `*.jks`
- `*.keystore`
- `*.p12`
- `*.pfx`
- `*.pem`
- `*.key`

The same list is git-ignored in `.gitignore` and enforced for Claude Code by
the `permissions.deny` rules in `.claude/settings.json`, which block reading
and editing these files. Change all three together. The rules are native
permissions rather than a hook on purpose: a hook runs a process in the
working tree, which may be an untrusted pull request, and an interpreter such
as `python3 -c` imports modules from that tree before the hook's own code.

## Session and temporary files

Files created while working on a task — scratch scripts, command output,
screenshots, DOM/accessibility snapshots, and AI-agent / MCP-server runtime
artifacts — must never be written into the tracked working tree, or they leak
into git history. Write them to a system temporary directory outside the repo
(e.g. under `$TMPDIR`, or `mktemp -d`), not to the repo root.

When a tool insists on writing inside the repo, keep it out of git:

- point it at a temp path if it accepts one (e.g. pass an absolute
  `$TMPDIR/...` filename), otherwise
- git-ignore its default output directory. Already ignored:
  `.playwright-mcp/` (Playwright MCP), `logs/` (electron-mcp-server).

Never `git add -A` / `git add .` blindly: review `git status` first and stage
only the files your change actually touches, never these artifacts.

### Running a scratch script with the project's toolchain

mise picks the pinned Node from the `mise.toml` of the current directory, so a
script outside the repository runs on whatever Node is global unless mise is
pointed at the repository. `mise -C <repo>` (`--cd`) does that by changing the
working directory before it runs the command, which also moves where relative
paths resolve: `mise -C <repo> exec -- node spike.mjs`, run from the script's
directory, looks for `<repo>/spike.mjs` and fails with `Cannot find module`.
Run from the repository and pass the script by its absolute path instead:

```sh
cd <repo> && mise exec -- node "$TMPDIR/spike/spike.mjs"
```

The same applies to every relative argument of the command, input and output
files included.

A script outside the tree does not resolve the project's dependencies either:
Node looks for `node_modules` next to the script, not in the working
directory. Resolve them from the package that declares them, so the script
gets the versions the application uses:

```js
import { createRequire } from "node:module";

const require = createRequire("<repo>/packages/core/package.json");
const { Agent, fetch } = require("undici");
```

Source files carry one of two header variants. Which one a file gets depends
on whether it continues code from the original OpenLens fork, not on what its
neighbours in the same directory look like.

**New files** — anything created from scratch, including rewrites,
translations, and reimplementations of removed or legacy logic — get the
single-line variant:

```ts
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
```

This holds even when the new file's logic is inspired by, or replaces, old
OpenLens code: inspiration is not continuation. `freelens/electron.vite.config.ts`,
written as a translation of the removed webpack config, is a new file.

**Files that continue code from the fork** keep the two-line variant:

```ts
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
```

A file continues fork code when its path was present in the fork-import commit
`0a5798c9` ("First commit - Open Lens fork from master branch"):

```sh
git ls-tree -r --name-only 0a5798c9 | grep -x <path>
```

or when `git log --follow -- <path>` traces it back to a path that was — that
is, git itself detects the file as a rename, move, or copy of fork-era code:

```sh
git log --follow --format= --name-only -- <path> | sort -u
```

Never add the `OpenLens Authors` line to a file that does not already have it
just because neighbouring files do. Do not touch legal or license text
(`LICENSE`, `README.md`, `freelens/license-header.txt`,
`freelens/static/build/license.txt`) or the upstream copyright notices of
vendored third-party code, which are unrelated to either header variant.

See [#2352](https://github.com/freelensapp/freelens/issues/2352) for the
cleanup that established this rule.

## Comments in JSON

Comments belong in `.jsonc`, never in `.json` — regardless of what the consuming
parser tolerates. TypeScript accepts `//` inside a `tsconfig.json`, and so do
several other tools, but anything that reads the file as strict JSON because of
its extension (`JSON.parse`, `jq`, an editor, a CI script) fails on it. No
`.json` file in this repository has comments, `tsconfig*.json` included;
`knip.jsonc` is where a commented configuration lives, and that is the right
pattern.

When a `.json` file needs an explanation — why an entry is excluded, why a
version is pinned — put it somewhere it survives: the package README, this
file, or the pull request that introduced it. Do not smuggle it into the JSON.

## Volatile Facts in Documentation

Documentation — `docs/`, the READMEs, this file — describes how things are,
and has to stay true without anyone maintaining it. Keep out of it whatever
goes stale on its own:

- issue and pull-request numbers,
- dates,
- counts that change without the document changing: how many extensions use
  something, how many members a namespace has, how many files import a module,
- the record of how it got there: which decisions were taken, which
  alternatives were tried and rejected, what was deferred and why, what an
  earlier version said, and status lines such as "shipped" or "open".

State the rule or the fact rather than the measurement or the history that led
to it: "no extension is known to use it", not "none of the 29 surveyed
extensions uses it"; "renderer code gets no guarantee of Node", not "decided in
the API review". The measurement, the history and the issue references belong
in the pull request description and the issue, which are dated by nature.
Those are working notes; documentation is for the reader who uses the thing
now, and needs only its current state.

Existing documents still carry such references. Do not copy them as a pattern,
and drop them from a passage you are rewriting anyway.

## Build System

### Commands

```bash
pnpm build:di           # Generate DI registration files
pnpm build              # Build all packages
pnpm build:app:dir      # Build Electron app directory
pnpm start              # Start development app
pnpm test               # Run tests
```

### Clean Build

This project uses Turbo for caching build artifacts.

When facing caching issues:

```bash
rm -rf .turbo packages/core/dist freelens/dist
pnpm build
```

## Runtime Environments in Type-Checking

The application runs code in two environments: **main** (Node, Electron) and
**renderer** (a browser page). `pnpm type:check` checks the sources of
`freelens/src` and `packages/core/src` once per environment, so that an API the
environment does not have fails the check before it fails at runtime:

| Program                   | Environment  | Checks                                  |
| ------------------------- | ------------ | --------------------------------------- |
| `tsconfig.typecheck.json` | DOM and Node | every file, tests and unclassified ones |
| `tsconfig.main.json`      | Node, no DOM | main and common files                   |
| `tsconfig.renderer.json`  | DOM, no Node | renderer and common files               |

The two environment programs extend `tsconfig.typecheck.json`, so they share
its `paths`. `pnpm type:check:environments` runs them alone.

### Which environment a file belongs to

The context segments in a file's path decide:

- `main/` or `main-api/` anywhere in the path: the main program;
- `renderer/` or `renderer-api/` anywhere in the path: the renderer program;
- `common/` or `common-api/` with neither of the above: both programs. A main
  or renderer segment wins over common, so `renderer/common/` is renderer code.

Contexts nest anywhere (`features/*/{main,renderer,common}`), and the
`include` and `exclude` globs of the two configs express exactly this rule.
Put new code under a context directory. A file whose path carries no context
has to be listed in the `include` of the config (or both configs, for common
code) of the process that loads it; the lists at the end of both `include`
arrays hold the existing ones. An unlisted one is checked by the combined
program only, like `extensions/extension-api.ts`, which bundles the types of
all three extension API namespaces on purpose.

Tests and test support (`*.test.ts(x)`, `__tests__/`, `test-utils/`,
`*.global-override-for-injectable.ts`, `getDiForUnitTesting`, …) are kept out
of both programs, because Vitest runs them with DOM and Node alike.

No tsconfig declares the Vitest globals. TypeScript has no per-file globals,
and tests share a program with the sources next to them, so declaring
`describe` or `vi` for the tests would declare them for production code too.
Test code imports what it uses instead:

```ts
import { describe, expect, it, vi } from "vitest";
```

`globals: true` stays on in the Vitest configs, because React Testing Library
registers its automatic cleanup only when the hooks exist as globals; it has no
effect on type checking. An override in `biome.jsonc` sets
`noRestrictedImports` for every file on the test-only modules: `vitest`,
`react-dom/test-utils`, `@testing-library/*` and the `act` named import of
`react`. A second override lifts it for tests and test support, so production
code in any package fails `biome check` when it imports one of them. The React
helpers matter most, because nothing else catches them: they type-check, build
and pass the unit tests, but `act` delegates to `React.act`, which the
production build of React leaves out, so the call throws only in a packaged
application. A new kind of test-support path, or a new test-support package
built on Testing Library, needs adding to the second override.

Common code uses only what both environments have: `globalThis.crypto`,
`TextEncoder`, `URL`, `AbortController`, `structuredClone`, timers. Write
`globalThis.` when in doubt. The extension-side version of the same rule is in
the source-layout section of `docs/extensions/migrating-from-v1.md`.

### How the check works

`scripts/type-check-environments.mjs` runs both programs and counts only the
errors in a program's own files, the ones its `include` classifies. A program
also holds every file its files import, including the other environment's
files and other packages, and their errors there say nothing about the
environment rule; the combined program checks those files in full.

Files that failed the check when it was introduced are on the legacy lists in
`scripts/type-check-environments/legacy.jsonc`: main or common files that need
DOM, and renderer or common files that need Node, which the node-integrated
renderer still allows. Their errors are tolerated. **The lists may only
shrink:** never add a file to make a new error pass. When a listed file stops
failing, the check fails until it is removed from its list.

`scripts/type-check-environments/expected-failures/` proves that the programs
still reject what they should: every line there that must fail carries
`@ts-expect-error`, so a program that lets it through reports an unused
directive. Its `main/`, `renderer/` and `common/` subdirectories fall into the
programs by the same rule as the sources.

Two things in the dependencies would otherwise defeat the programs silently;
the expected-failure files catch both if they come back:

- A declaration file with `/// <reference types="node" />`, and winston,
  electron and undici all have one, loads `@types/node` into any program that
  reaches it, whatever `types` says. The renderer program sets `typeRoots` to
  `scripts/type-check-environments/renderer-type-roots/`, whose empty `node`
  package absorbs those references.
- A declaration file with `/// <reference lib="dom" />` adds DOM to any program
  that reaches it, whatever `lib` says. The main program reaches renderer code
  through type imports, so the pnpm patch of `@xterm/xterm` removes that line
  from its typings. A new dependency with the same line needs the same
  treatment.

DOM _type_ names such as `HTMLElement` still resolve in the main program,
because `@types/react` declares empty stand-ins for them; values such as
`document` and `window` do not.

### The editor

VS Code uses the root `tsconfig.json`, which has DOM and Node together, for
every file. The environment programs are a CI check the editor does not
reflect: a Node global in renderer code shows no type error in the editor and
fails `pnpm type:check`.

Biome covers part of the gap while you type. An override in `biome.jsonc`
turns on `noNodejsModules` for the `renderer/`, `renderer-api/`, `common/` and
`common-api/` files of `freelens/src` and `packages/core/src`, classified by
the same path rule as the renderer program and with the same test files left
out. It catches **imports** of Node builtins (`node:fs`, `path`, …), so the
Biome extension flags them in the editor and `biome check` fails on them. It
does not catch **Node globals** such as `Buffer`, `process`, `__dirname` or
`NodeJS.*` types, and it does not look at the files that carry no context in
their path; only `pnpm type:check` catches those.

The files that import a Node builtin today are exempted in a second override,
which turns the rule off for them. Every one of them is also on the renderer
legacy list, and `scripts/type-check-environments.mjs` fails when an exempted
file is not, so the exemptions can only shrink with that list: remove a file
from both when you move its Node import out.

Every path in the `includes` of a `biome.jsonc` override starts with `**/`,
negated ones included (`!**/packages/core/src/...`). Trunk Check, which is what
runs Biome in CI, runs it from a sandbox outside the repository with
`--config-path` pointing back at `biome.jsonc`, and there a pattern anchored at
the repository root matches no file, so the override silently does nothing.
A plain `biome check` from the repository root matches both forms, so only
`trunk check` shows the difference. `scripts/type-check-environments.mjs`
checks every path of every override and fails on one that is neither `**` nor
starts with `**/` or `!**/`.

## Knip

`pnpm knip:check` runs knip in two passes, both for dependencies. CI runs it
after `pnpm build`, so run a build first.

- The development pass, `pnpm knip:development`, also reports **unused
  files**: a module, barrel or stylesheet that no entry reaches. Stylesheets
  count, because the `project` globs of the packages with styles include
  `scss` and `css`, and knip follows both the side-effect imports in
  TypeScript and `@use` in SCSS.
- The production pass, `pnpm knip:production`, runs with `--production
  --strict` over the entries marked with `!` in `knip.jsonc`, the code that
  reaches the bundles. In it only `dependencies` count. It does not check
  files: from the `!` entries alone, the test support and the development
  scripts count as unused.

When the file check reports a file, remove it rather than ignore it. Before
you do, check that nothing reaches it in a way knip cannot see, and that
`pnpm type:check` and the tests still pass without it. A file that is reached
that way, through a config path built at runtime, a `tsconfig.json` `include`
or a `meta.load-css()`, gets an entry in `knip.jsonc` instead, with a comment
saying how it is reached. A `register-injectables.ts` that nothing imports is
the generator's output and gets an ignore: removing it only makes
`pnpm build:di` write it again.

Both passes run with `--no-gitignore`, because the dependency check reads the
bundled `freelens/static/build/main.js` to find the packages the main bundle
leaves external. The file check therefore also sees build output and local
files; `knip.jsonc` ignores the build output nothing imports and the local
artifacts of the MCP servers and of coverage. One config serves both passes,
so `--no-config-hints` hides the hints about entries only one pass needs.

The check leaves out unused exports and types, and knip cannot report the
unused classes inside a stylesheet.

## Dependency Injection System

This project uses `@ogre-tools/injectable` for dependency injection with an **explicit registration system** that replaces the old webpack-based auto-registration. All injectable registrations are generated by `pnpm build:di`.

A feature lives in its own directory under `packages/core/src/features/`,
split by process into `common/`, `main/` and `renderer/`. The generator
registers every file named `*.injectable.ts` or `*.injectable.tsx`.

### Registration Hierarchy

The system has three levels of registration files:

1. **Leaf registration files** - Register individual injectables
   - Example: `features/preferences/renderer/close-preferences/register-injectables.ts`
   - Pattern: Import injectable definitions and call `di.register()`
   - Each call wrapped in try-catch for idempotency

2. **Aggregator registration files** - Register subdirectories
   - Example: `features/preferences/renderer/register-injectables.ts`
   - Pattern: Import and call `registerXxxInjectables(di)` from subdirectories
   - Each call wrapped in try-catch to handle duplicates

3. **Root registration files** - Entry points per process
   - `register-injectables-main.ts` - Main process
   - `register-injectables-renderer.ts` - Renderer process
   - Called during DI container initialization

### Directory Patterns

#### Shared Aggregators

Directories with `register-injectables.ts` that aggregate subdirectories:

```text
features/vars/
├── register-injectables.ts     ← Shared aggregator (calls common/)
├── common/
│   └── register-injectables.ts
└── build-version/
    ├── main/register-injectables.ts      ← Process-specific (NOT aggregated)
    └── renderer/register-injectables.ts  ← Process-specific (NOT aggregated)
```

**Key insight:** Shared aggregators only handle **shared** subdirectories (like `common/`). They do NOT aggregate **process-specific** subdirectories (`main/`, `renderer/`).

#### Process-Specific Paths

Paths containing `/main/` or `/renderer/` are process-specific and must be imported directly:

- ✅ Include: `features/vars/build-version/main/register-injectables`
- ❌ Exclude: `features/vars/common/register-injectables` (handled by parent aggregator)

### When to Re-run Generation

Run `pnpm build:di` when:

- Adding new injectable files
- Moving injectable files
- Renaming injectable files
- Changing directory structure
- Modifying generation script

The build process automatically runs this, but you can run it manually to verify changes.

### Bundled Binary Versions

The versions of the bundled `freelens-k8s-proxy`, `kubectl` and `helm` live in
the `config` block of `freelens/package.json`, and their exact digests are
pinned in `freelens/binaries.lock.json`. The build reads the expected checksum
from that lock rather than from the vendor, so **a version bump without
regenerating the lock fails the build**:

```sh
pnpm update-binaries-lock
```

The generator downloads all eighteen artifacts (three tools, three platforms,
two architectures), checks each against its publisher's signature — GitHub build
provenance for freelens-k8s-proxy, PGP for helm, keyless cosign for kubectl —
and only then writes the lock. `cosign` comes from mise (`mise install`), and
`GITHUB_TOKEN` should be set unless you want to share 60 unauthenticated API
calls per hour with the rest of your IP. Use `--only <tool>` to refresh a single
tool while iterating.

helm is downloaded as a tarball, so its `sha256` pins the archive and a second
digest, `binarySha256`, pins the binary extracted from it. The build hashes
every file already in `freelens/binaries/` against the lock on each run and
downloads it again on a mismatch; it keeps no record of what it verified
before. That is what makes the directory safe to restore from a CI cache:
whoever could write a binary into the cache could write such a record too.
For the same reason the binaries are not an output of a cached Turbo task: the
Turbo cache would restore them without the check. `build:binaries` runs
uncached on every build instead, which costs only the hashing when the
binaries are in place.

`.github/workflows/binaries-lock-check.yaml` enforces both that the lock is
current and that no digest changed while its version stood still. On a
Renovate branch a stale lock does not fail the check: Renovate bumps the
version but cannot run the generator, so the workflow regenerates the lock,
checks it for replaced artifacts, and commits it to the branch with `GH_TOKEN`,
which starts the checks again on the new commit.

### Downloaded kubectl Versions

The bundled kubectl is not the only one the application runs: a cluster whose
minor version differs gets a version-matched kubectl downloaded at runtime. The
map of which patch to fetch per minor lives in
`packages/kubectl-versions/build/versions.json`, and the digest of every
artifact that map can produce is pinned in
`packages/kubectl-versions/build/checksums.json`, keyed by version and then by
`${platform}/${arch}`.

`Kubectl.downloadKubectl()` hashes what it downloaded and refuses anything that
does not match its pin, and `ensureKubectl()` refuses to download at all when
there is no pin, falling back to the bundled binary. **A version added to the
map without a pin therefore never gets downloaded**, so the two files are
regenerated together:

```sh
pnpm --filter @freelensapp/kubectl-versions compute-versions
pnpm update-kubectl-checksums
```

The generator reads `dl.k8s.io` only, never a mirror — pinning bytes from a
mirror would let a compromised mirror bless its own digest. It skips versions
already present, which makes a run incremental and an existing pin immutable,
and it verifies each download against both the published `.sha256` and the
keyless cosign signature before recording it. `cosign` comes from mise
(`mise install`).

Both files start at 1.22, the oldest line Kubernetes publishes a signature for,
and coverage is not uniform below that floor's neighbours: v1.22.17 has no
`windows/arm64` build, so the generator logs an unpublished variant and carries
on rather than failing. `.github/workflows/kubectl-checksums-check.yaml`
verifies added pins and asserts that no existing digest changed.

### Development Tools (mise)

The development tools (`cosign`, `node`, `yq`) are declared in `mise.toml` and
pinned with their checksums in `mise.lock`. The lock uses lockfile format
version 3 (`lockfile_version = 3`), which **needs mise 2026.9.16 or newer**: an
older mise rejects the lock, so `mise install` fails until mise is upgraded.

After changing a version in `mise.toml`, regenerate the lock with `mise lock`,
which refreshes every tool on every platform in the file. `mise install`
re-locks only the platform it runs on and leaves the others stale.

The workflows set up Node from `.nvmrc` rather than through mise, so a Node
version change goes into both `mise.toml` and `.nvmrc`.

## Common Development Tasks

### Debugging the Application

**Main Process:**
- Logs in terminal where `pnpm start` was run
- Use `console.log()` or proper logger

**Renderer Process:**
- Open DevTools in the app
- Check Console tab for errors and logs
- Use React DevTools for component inspection
- `pnpm dev` also exposes a Chrome DevTools Protocol endpoint on port 9223
  (`--remoteDebuggingPort`). Note that each cluster's UI renders in a
  cross-origin `<clusterId>.renderer.freelens.app` iframe, so inspecting or
  automating cluster views requires a frame-aware CDP client — see the
  AI-agent inspection notes in DEVELOPMENT.md.

**Common Errors:**
- `Tried to register same injectable multiple times` - See DI section above
- `Tried to inject non-registered injectable` - Check registration files were
  generated. In a unit test, a newly added `*.injectable.ts` can report this
  even when the file exists and `pnpm build:di` ran: `getDiForUnitTesting`
  registers through `import.meta.glob(..., { eager: true })`, and
  `node_modules/.vitest-cache` keeps the glob expanded over the files that
  existed when it was first cached. Clear it (`rm -rf node_modules/.vitest-cache`)
  and re-run.
- Permission errors on macOS - Expected during development

### Working with the bundler (electron-vite)

The project bundles with electron-vite (Vite + Rollup); the legacy Webpack
layer was removed in #2118.

- `freelens/electron.vite.config.ts` - main/renderer build and dev-server config
- `pnpm dev` runs `electron-vite dev` with Vite HMR; renderer source changes
  hot-reload, main-process changes rebuild and relaunch (via `--watch`)
- Changes to generated files (e.g. DI registration) require a full rebuild

**Cache issues:** Delete the build output and rebuild
(`rm -rf .turbo packages/core/dist freelens/dist`)

### The Electron binary

`pnpm install` leaves the `electron` package without its runtime binary. The
package has no `postinstall` script, so `electron: true` in `allowBuilds` has
nothing to run; it downloads the binary lazily instead, when
`require("electron")` or its `electron` bin finds `path.txt` missing.
electron-vite does not go through either: it reads
`node_modules/electron/path.txt` itself and throws `Electron uninstall` when
the file is absent, so `electron-vite dev` alone never triggers the download.

The `predev` script of `freelens/package.json` therefore runs the package's
`install-electron` bin (`electron/install.js`) before `electron-vite dev`.
`install.js` exits at once when the binary of the installed version is
already in place, and otherwise downloads it, verifies it against the
package's `checksums.json` and writes `path.txt`. pnpm runs `pre` scripts for
`pnpm run dev`, both inside `freelens/` and through the root `turbo run dev`,
which invokes `pnpm run dev` in the package.

The `dev` script is for local development only. CI does not use it: the
workflows that need the binary run `electron/install.js` explicitly, as a
separate step, before tests or the build.

## Styling

Freelens carries four styling systems (theme CSS custom properties, global
plain SCSS, CSS Modules, and Tailwind v4). Which one to use is not a matter of
taste — each has a defined role. Before adding or changing any stylesheet or
`className`, read [`docs/styling.md`](./docs/styling.md). In short:

- **Theme values** (colors, fonts): CSS custom properties from the TS theme
  system (`var(--…)`) — the single contract every other system reads.
- **Shared components** (`packages/ui-components`) and anything an extension
  may restyle: global PascalCase class + plain SCSS + `var(--…)`. No Tailwind
  (its JIT only scans core TSX), no CSS Modules (the class names are public
  API).
- **Core single components / full views**: CSS Modules (`*.module.scss`).
- **Local layout inside core-only TSX**: Tailwind utilities. The legacy
  `flexbox.scss` utilities have been removed — do not reintroduce them.
- **Extensions**: see the styling section of
  [`docs/extensions/migrating-from-v1.md`](./docs/extensions/migrating-from-v1.md).

## Extension API

The extension specification lives in three documents, and which one to read
depends on the question:

- [`docs/extensions/api.md`](./docs/extensions/api.md) — the **normative
  contracts**. Each states the guarantee, the stable surface and the failure
  mode. Read this before changing anything under `packages/extensions/` or
  `packages/core/src/extensions/`.
- [`docs/extensions/binaries.md`](./docs/extensions/binaries.md) — what an extension
  may **ship and execute** besides JavaScript, and what the host does with it.
- [`docs/extensions/migrating-from-v1.md`](./docs/extensions/migrating-from-v1.md) — the
  author-facing **porting guide** from v1.

The agent skills of freelensapp/freelens-example-extension,
`create-freelens-extension` and `port-freelens-extension-to-v2`, link to these
documents on `main` and cite their sections by name. So does the template of
the v2 migration issue that a port copies,
`skills/port-freelens-extension-to-v2/references/migration-issue.md`, except
that its links are pinned to a commit of this repository. Renaming or removing
one of the sections below therefore needs a matching change to the `SKILL.md`
files under `skills/` in that repository, and to that template when its pin
moves to a commit with the change:

- in `api.md`, the contracts C1 to C15 by number as a range, and C3
  (host-provided singletons), C6 (registration), C9 (routing), C10 (styling
  and CSS), C12 (HTTP) and C15 (the host's kubectl, helm and terminal
  environment) on their own;
- in `migrating-from-v1.md`, these headings:
  - "Step one: bump `engines.freelens`"
  - "`package.json` for an extension"
  - "Source layout: one tsconfig per runtime environment"
  - "MobX 7 and mobx-react 10 (standard decorators only)"
  - "Registering things: declarative fields"
  - "Reaching a catalog cluster"
  - "v1→v2 rename table"
  - "Node and Electron in the renderer"
  - "Styling and CSS"
  - "The development loop"
  - "Checklist", and the two items at its end that it marks as failing
    silently;
- `binaries.md` as a whole document, by its file name;
- in this file, the heading "Modifying GitHub Actions Workflows", which the
  template cites, and the section of the same name in
  `.github/claude/ci-agent.md`, which that heading links to for the full rule.

Three traps worth carrying without looking them up. The API surface is only what
the `Common` / `Main` / `Renderer` namespaces re-export — every other
`@freelensapp/*` package is private and inlined into the published declaration,
so a symbol that is not re-exported is unreachable by any means. And the host
must be the single instance of React, mobx and monaco; a second
copy of mobx fails **silently**, so changes there need an identity assertion
rather than a passing test suite.

The third: the published declaration is not the source. `rolldown-plugin-dts`
turns each module behind a namespace into a `declare namespace` that
re-exports its members, and it drops the `type` modifier on the way. A **class
re-exported type-only**, with `export type { C }` or `export type { C } from
"…"`, is therefore declared as a value too, so `new C(…)` and `x instanceof C`
compile against the declaration and throw in the extension. Use a type alias
instead, `export type C<T> = import("…").C<T>`, carrying the class's type
parameters with their constraints and defaults.

Two guards catch a regression.
`packages/core/src/extensions/__tests__/extension-api-declared-values.test.ts`
walks the built declaration with the TypeScript 7 checker
(`typescript/unstable/sync`) and fails on every value it declares that the
runtime namespace object does not have. The fixture extension's
`packages/fixture-extension/src/common/contract-types.ts` names the
type-and-value pairs of `K8sApi`, `type X` and `const X` of the same name, as
types, so its type check fails if one loses its type meaning in the bundle.

The bundle also depends on `rolldown-plugin-dts` 0.28.8 or newer, which
tree-shakes a namespace import whose members a declaration names only by
qualified name, such as `import * as utilities` in `common-api/utils.ts`. An
older version keeps every member of the module in the bundle. That includes
the Node-bound members `Common.Util` leaves out, with their `node:` imports.
`build:dist` of `@freelensapp/extensions` fails when the bundle imports a Node
builtin or references Node's types, and names that tree-shaking as the likely
cause, so a regression in the plugin fails the build rather than reaching an
extension.

## Best Practices

1. **Always regenerate DI files** after adding/moving injectables
2. **Full rebuild** when in doubt about cached state
3. **Check both processes** when debugging (main + renderer)
4. **Use semantic search** to find examples in codebase
5. **Follow existing patterns** - grep for similar implementations
6. **Test changes** before committing
7. **Run validation after file changes (especially before commit):** run `trunk check` (or `pnpm trunk check` if `trunk` is not installed locally)
8. **For main project TypeScript, HTML, CSS, SCSS, YAML and Markdown files:** run `pnpm biome check` (`--write` to apply the fixes). Biome is not a dependency of the project: the `biome` script of the root `package.json` runs the pinned version through `pnpm dlx`. A bare `biome` or `pnpm exec biome` runs whatever `biome` is on `PATH`, such as a Homebrew one, whose version may format differently and rewrite code the change does not touch.
9. **For other file types:** use `trunk check` (or `pnpm trunk check` if `trunk` is not installed locally)
10. **Do not use Antropic Fable for coding tasks** — Fable may be used only for planning,
    analysis, and thinking through problems. When writing or editing code,
    use standard editing tools instead.

## Local Agent: Triggering the GitHub Agent

These rules apply to an agent running on a developer machine (a local Claude
Code session), not to the workflow agent. The local agent shares the repository
with the CI agent defined in `.github/workflows/claude.yaml`, and every comment
it writes on GitHub is a potential trigger for it.

### How the trigger works

`claude.yaml` starts a run when the body of a **newly created** comment (issue
comment or PR review comment), a **newly opened** issue (body or title), or a
**submitted** PR review contains the string `@claude`, and its author has
write access to the repository (the admin, maintain or write role). The
workflow condition pre-filters on OWNER, MEMBER or COLLABORATOR, which does not
imply write access, and the first step of the run checks the actual
permission; a run triggered by anyone else fails there. The check is a plain
`contains(github.event.comment.body, '@claude')` substring test, so the string
fires the workflow wherever it appears — including inside a code span, a fenced
block, a quoted line, or a URL. Markdown formatting is not an escape.

The trigger text may also carry `[model:<alias>]`, `[effort:<level>]` and
`[runs-on:<alias>]` markers, which select the model, the reasoning effort and
the runner for that run (see the `parse` job for the accepted aliases). They are
only read from the triggering text.

The default model is `claude-opus-5-5[1m]` (Opus 5.5 with the 1M-token
context) and it runs at `high` effort. Naming a model explicitly drops that
default: the run then uses the CLI default effort unless `[effort:...]` also
says otherwise. Accepted levels are `low`, `medium`, `high`, `xhigh` and
`max`; anything else is ignored with a note in the job log.

### Rules for the local agent

1. **Write the handle only to start a run.** Ask the user before triggering: a
   run is a 120-minute CI job on the repository, so it is the user's call, not
   an implementation detail.
2. **Escape the handle when merely referring to it.** In issue bodies, PR
   descriptions, review notes, commit messages and documentation, write
   `@<!-- -->claude` (displays as the handle, but the raw body does not contain
   the literal string, so `contains()` does not match) or describe it in prose
   as "the Claude handle". This is what keeps a plan or a bug report that
   documents the trigger from firing it.
3. **Editing never triggers.** The workflow subscribes only to `created`,
   `opened` and `submitted` events — not `edited`. So updating a comment, an
   issue body or a PR description is always safe, even when the text already
   contains a real trigger, and conversely editing a comment to add the handle
   does **not** start a run: a new comment is required.
4. **One trigger per task.** Do not repeat the handle in follow-up comments
   while a run is in flight; each occurrence starts another concurrent job.
5. **Push first.** The workflow checks out the remote ref (the PR head, or the
   default branch for issues), so anything not pushed is invisible to it.

## GitHub Actions (Claude Code Action) Rules

The rules for the agent running in the workflows live in
[`.github/claude/ci-agent.md`](.github/claude/ci-agent.md), and reach that
agent through its system prompt: the workflows fetch the file from `main`,
next to this one. No local session loads it, so change those rules there.

### Modifying GitHub Actions Workflows

The agent running in the workflows cannot push changes under
`.github/workflows/`, because its GitHub token lacks the `workflows`
permission. It delivers a workflow change as a complete file under
`github-workflow-fix/` instead, for a maintainer to move into place. The full
rule is
["Modifying GitHub Actions Workflows"](.github/claude/ci-agent.md#modifying-github-actions-workflows)
in `.github/claude/ci-agent.md`.
