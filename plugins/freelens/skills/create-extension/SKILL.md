---
name: create-extension
description: Create a new Freelens extension for the Freelens v2 extension API (Freelens 2.x), starting from a copy of freelensapp/freelens-example-extension, the reference template for building, type-checking, testing and releasing one. Use when the user wants a new Freelens extension, or wants to set up an empty repository as one. Covers copying the template, which of its files to keep, adapt, remove or rewrite, the patterns the new code must follow and how to verify the result in Freelens. Not for an existing Freelens or Lens extension written for the v1 API; port-extension-to-v2 covers that.
license: MIT
compatibility: Needs network access to github.com and raw.githubusercontent.com, for the template and the linked documents, and Node.js with pnpm (through corepack) to build and check the extension.
---

# Create a Freelens extension

A Freelens v2 extension starts as a copy of
[freelensapp/freelens-example-extension](https://github.com/freelensapp/freelens-example-extension),
the reference template the Freelens extension documentation points to. This
skill is the workflow. The documents below are the source of truth: read the
parts each step names instead of relying on memory, because most extension code
found elsewhere is written for the v1 API, which v2 does not load.

## Documents

Fetch the raw URLs; they return Markdown.

| Document                                                                                                                     | Read it for                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`api.md`](https://raw.githubusercontent.com/freelensapp/freelens/v2.0.0/docs/extensions/api.md)                             | The normative contracts C1 to C15: what the host guarantees and how a violation fails.                                                                 |
| [`migrating-from-v1.md`](https://raw.githubusercontent.com/freelensapp/freelens/v2.0.0/docs/extensions/migrating-from-v1.md) | The v2 API from an author's side; "Registering things: declarative fields", "Styling and CSS" and "The development loop" apply to a new extension too. |
| [`binaries.md`](https://raw.githubusercontent.com/freelensapp/freelens/v2.0.0/docs/extensions/binaries.md)                   | Only for an extension that ships executables.                                                                                                          |
| [`AGENTS.md`](https://raw.githubusercontent.com/freelensapp/freelens-example-extension/main/AGENTS.md) of the template       | The build, type-check, test, lint and CI patterns, each with its reason, and "Rules That Fail Silently".                                               |
| [`README.md`](https://raw.githubusercontent.com/freelensapp/freelens-example-extension/main/README.md) of the template       | Installing an extension in Freelens and the development loop.                                                                                          |
| [The source tree](https://github.com/freelensapp/freelens-example-extension/tree/main) of the template                       | The worked example: a CRD in two API versions, with a page, a details panel, a menu item and a preference.                                             |

## 1. Copy the template

The template is not a GitHub template repository. Copy its tree at `main`,
without its git history, into the new repository's root. Either:

```sh
curl -fsSL https://github.com/freelensapp/freelens-example-extension/archive/refs/heads/main.tar.gz |
  tar -xz --strip-components=1
```

or, into a new directory:

```sh
gh repo clone freelensapp/freelens-example-extension my-extension -- --depth 1
rm -rf my-extension/.git
```

Then `git init` if the directory is not a repository yet.

## 2. Keep, adapt, remove, rewrite

Every file of the template is in one of the groups below. A file of the copy
that is not listed was added to the template after this list: find what it is
for in the template's `AGENTS.md` before deciding.

### Keep as is

The tooling every extension shares. Its versions follow Freelens, and
`AGENTS.md` gives the reason for each setting; change one only with a reason of
the same kind.

- Build: `vite.config.mjs`, `build/vite-plugin-host-modules.mjs`,
  `build/vite-plugin-standard-decorators.mjs`,
  `build/vite-plugin-css-module-declarations.mjs`, `svgo.config.mjs`.
- TypeScript, one program per environment: `tsconfig.base.json`,
  `tsconfig.json`, `src/tsconfig.json`, `src/main/tsconfig.json`,
  `src/renderer/tsconfig.json`, `src/common/tsconfig.json`.
- Environment tests: `environment-tests/tsconfig.json`,
  `environment-tests/tsconfig.main.json`,
  `environment-tests/tsconfig.renderer.json`, `environment-tests/dom-apis.ts`,
  `environment-tests/node-apis.ts`, `environment-tests/shared-apis.ts`,
  `environment-tests/worker-apis.ts`.
- Tests: `vitest.config.ts`, `test/freelens-extensions.ts` (the runtime stub of
  `@freelensapp/extensions`; add the members the new tests reach),
  `vitest.integration.config.ts` and `integration/tsconfig.json` (the runner
  and the program of the integration tests).
- Lint and format: `biome.jsonc`, `knip.jsonc`, `.trunk/trunk.yaml`,
  `.trunk/.gitignore`, `.yamllint.yaml`, `examples/.yamlfmt.yaml`,
  `integration/fixtures/.yamlfmt.yaml`, `.editorconfig`, `.gitattributes`,
  `.gitignore`.
- Toolchain and dependencies: `mise.toml`, `mise.lock`, `.nvmrc`,
  `pnpm-workspace.yaml`, `pnpm-lock.yaml` (`pnpm install` updates it after the
  `package.json` changes), `.renovaterc.json` (needs the Renovate app on the
  repository; a dependency that the Freelens catalog does not have must be
  excluded with `!` in its catalog rule, or its lookup fails on the Dependency
  Dashboard).
- Agent configuration: `CLAUDE.md`, `.claude/settings.json`.
- Shared components and styles: `src/renderer/components/error-boundary.tsx`,
  `src/renderer/components/error-boundary.test.tsx`,
  `src/renderer/components/error-page.tsx`,
  `src/renderer/components/error-page.module.scss`,
  `src/renderer/components/error-page.module.d.scss.ts`,
  `src/renderer/components/error-page.test.tsx`,
  `src/renderer/components/available-version.tsx`,
  `src/renderer/components/available-version.module.scss`,
  `src/renderer/components/available-version.module.d.scss.ts`,
  `src/renderer/components/available-version.test.tsx`
  (`createAvailableVersionPage`, for a CRD served in more than one API
  version; remove the four files if no page needs them),
  `src/renderer/vars.scss`.
- Workflows that apply to any extension and need no secret:
  `.github/workflows/type-check.yaml`, `.github/workflows/check.yaml`,
  `.github/workflows/unit-tests.yaml`, `.github/workflows/trunk-check.yaml`,
  `.github/workflows/mise-lock-check.yaml`,
  `.github/workflows/cleanup-cache.yaml`,
  `.github/workflows/integration-tests.yaml` (removed with the integration
  tests, "4. Verify").

### Keep, then adapt

- `src/main/index.ts`: the `Main.LensExtension`. Rename the class; it loads the
  preferences store, so drop that with the store.
- `src/renderer/index.tsx`: the `Renderer.LensExtension` with every
  registration. Replace the `Example` registrations with the extension's own,
  keeping `extension={this}` on each page, and keep `clusterPages`,
  `kubeObjectDetailItems` and `kubeObjectMenuItems` mapped through
  `withPageErrorBoundary`, `withDetailsErrorBoundary` and
  `withMenuItemErrorBoundary`, so that every entry renders inside the error
  boundary ("Renderer Components" in `AGENTS.md`). List in `customResources` the
  models of the custom resources the extension gives a page of its own, and
  only those ("CRD KubeObject Pattern" in `AGENTS.md`).
- `src/renderer/api/types.ts`: `ExampleKubeObjectCRD`, the CRD metadata with a
  page title. Rename it, or remove it with the last CRD model.
- `src/common/store/index.ts`, `src/common/store/preferences-store.ts`,
  `src/common/store/preferences-store.test.ts`: `ExamplePreferencesStore`, a
  store loaded by both processes. Rename it, its `configName` and its fields,
  and keep a test that imports the class: it fails on an `@observable` field
  without `accessor`. Remove all three if the extension stores nothing.
- `src/renderer/preferences/example-preference.tsx`: the `appPreferences`
  input and hint. Adapt them to the store, or remove them with it.
- `src/renderer/icons/index.ts`: re-exports the icons; point it at the new
  ones.
- `integration/__tests__/extensions.tests.ts`: keep it with the integration
  tests ("4. Verify"). The test installs the checkout in place in Freelens
  dev, opens its preferences page, and fails on any error either process logs.
  Remove the preferences test if the extension has no `appPreferences`.
- `integration/__tests__/extension-helpers.ts`: the code the integration test
  sessions share. Set `extensionName` to the new package name,
  `preferencesTitle` and `preferencesInputLabel` to the extension's
  `appPreferences` entry, the page id in
  `pageLinkTestId` to the extension's `clusterPageMenus` id, and `crdName`,
  `testObjectName` and the paths of `setUpCluster` and `tearDownCluster` to
  the extension's own CRD and test objects.
- `integration/__tests__/example-v1alpha1.tests.ts`,
  `integration/__tests__/example-v1alpha2.tests.ts`,
  `integration/fixtures/v1alpha1/kustomization.yaml`,
  `integration/fixtures/v1alpha1/namespace.yaml`,
  `integration/fixtures/v1alpha2/kustomization.yaml`,
  `integration/fixtures/v1alpha2/namespace.yaml`: one session per API version
  that clicks through the list page, the details and the menu of the test
  object on a kind cluster. Adapt them to the extension's own kinds and
  versions, one test file and one fixtures directory per version, or remove
  them for an extension without a cluster view. "Workflows" in `AGENTS.md`
  explains why each version runs in a session of its own.

### Remove, or replace with the extension's own feature

The `Example` CRD. Its files are the model to follow for the extension's own
resources, one file per API version.

- Models and their tests: `src/renderer/api/example/example-v1alpha1.ts`,
  `src/renderer/api/example/example-v1alpha1.test.ts`,
  `src/renderer/api/example/example-v1alpha2.ts`,
  `src/renderer/api/example/example-v1alpha2.test.ts`.
- List pages: `src/renderer/pages/examples-page-v1alpha1.tsx`,
  `src/renderer/pages/examples-page-v1alpha2.tsx`,
  `src/renderer/pages/examples-page.module.scss`,
  `src/renderer/pages/examples-page.module.d.scss.ts`.
- Details panels: `src/renderer/details/example-details-v1alpha1.tsx`,
  `src/renderer/details/example-details-v1alpha2.tsx`.
- Menu items: `src/renderer/menus/example-active-toggle-menu-item-v1alpha1.tsx`,
  `src/renderer/menus/example-active-toggle-menu-item-v1alpha2.tsx`.
- Icon: `src/renderer/icons/example.svg`, `src/renderer/icons/example.tsx`.
- CRDs and test objects: `examples/v1alpha1/crds/customresourcedefinition.yaml`,
  `examples/v1alpha1/crds/kustomization.yaml`,
  `examples/v1alpha1/test/example.yaml`,
  `examples/v1alpha1/test/kustomization.yaml`,
  `examples/v1alpha2/crds/customresourcedefinition.yaml`,
  `examples/v1alpha2/crds/kustomization.yaml`,
  `examples/v1alpha2/test/example.yaml`,
  `examples/v1alpha2/test/kustomization.yaml`.

### Rewrite

- `package.json`: `name` (in an npm scope the publisher owns; `@freelensapp`
  is not available), `description`, `repository.url`, `author`, `copyright`
  and `keywords`, and `version` reset to the new extension's first version.
  Keep `type`, `main`, `renderer`, `files`, `engines`, `publishConfig`,
  `scripts`, `devDependencies` and `packageManager`.
- `README.md`: the new extension's own. Its "Install", "Build from the source"
  and "Development loop" sections carry over with the names replaced.
- `LICENSE`: the copyright holder and years, or another license, matching
  `license` in `package.json`.
- `AGENTS.md`: keep the generic sections as they are: "Common Commands",
  "Rules That Fail Silently", "Build", "TypeScript", "Lint and CI",
  "Checking the Extension in Freelens Dev" (with the example page URL of the
  new extension), "Code Style", "Security", "Electron Multi-Process",
  "Troubleshooting" and "Best Practices". Rewrite the ones about this
  repository: "Project Overview" (its toolchain and dependency paragraphs
  stay), "Architecture", and "CRD
  KubeObject Pattern" and "Renderer Components" with the new extension's
  classes and files in place of `Example`. Keep "GitHub Actions (Claude Code
  Action) Rules" only with the Claude workflows below, with
  `freelensapp/freelens-example-extension` and `freelensapp` replaced by the
  new repository and its owner. Drop the "Agent Skills" section, which is
  about the template's place behind these skills.

### Workflows tied to the repository

Keep each one only if the extension wants what it does, and configure the
repository first: without its environment and secret, it fails.

| Workflow                                                                                                            | What it does                                                                                                                                                                                                                 | Needs                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/release.yaml`                                                                                    | On a `v*` tag: builds, packs, publishes to npm (a version with a hyphen under the `next` dist-tag) and creates a GitHub release, marked as a prerelease for such a version, with the tarball, its `.tgz.sha256` and an SBOM. | Environment `publishing`, with npm trusted publishing set up for the package, the repository and this workflow, or an `NPM_TOKEN` secret.        |
| `.github/workflows/npm-version.yaml`                                                                                | On demand, and after a release that is not a prerelease: opens an "Automated npm version" pull request with the bumped version.                                                                                              | Environment `automated` with a `GH_TOKEN` secret that can push branches and open pull requests.                                                  |
| `.github/workflows/tag.yaml`                                                                                        | When an "Automated npm version" pull request is merged, prerelease versions included: tags `main` with `v<version>`, which starts `release.yaml`.                                                                            | Environment `automated` with `GH_TOKEN`; a tag created with the default `GITHUB_TOKEN` starts no workflow.                                       |
| `.github/workflows/npm-dedupe.yaml`, `.github/workflows/trunk-upgrade.yaml`, `.github/workflows/biome-migrate.yaml` | Scheduled maintenance: each opens a pull request when it changes something.                                                                                                                                                  | Environment `automated` with `GH_TOKEN`.                                                                                                         |
| `.github/workflows/claude.yaml`, `.github/workflows/claude-task.yaml`                                               | Claude Code in CI, started from a comment that mentions the Claude handle, or on demand.                                                                                                                                     | The Claude GitHub App on the repository, a `CLAUDE_CODE_OAUTH_TOKEN` secret, and the "GitHub Actions (Claude Code Action) Rules" in `AGENTS.md`. |

## 3. Write the extension's code

Follow the patterns the template's `AGENTS.md` and the contracts set:

- "CRD KubeObject Pattern" in `AGENTS.md` for a custom resource model: the
  metadata in `static readonly` properties, the instance `kind` and
  `apiVersion` declared as literals, per-object logic in `static` methods that
  take the object, and no instance methods, because the objects the host
  passes are not instances of the subclass.
- "Renderer Components" in `AGENTS.md` for pages, details panels, menu items
  and preferences: `observer`, the error boundary applied where the
  registrations are made (a `try`/`catch` around the call of a component
  misses what a child or a callback of the host's list layout throws later),
  the extension passed from the registration, details panels and menu items
  registered with
  `Renderer.K8sApi.detailsFor` and `Renderer.K8sApi.menuItemFor`, menu item
  props from `Common.Types.KubeObjectMenuItemProps`, CSS modules imported for
  their class names, icons through `?raw`.
- "Rules That Fail Silently" in `AGENTS.md`: check every change against it,
  since each item compiles when broken.
- Contract C6 (registration) in `api.md`: an extension contributes through the
  declarative fields of its `LensExtension` subclass, and each registered
  component gets only the props the host renders it with.
- Contract C9 (routing) in `api.md`: a page component gets only `params`.
- A new runtime dependency is bundled and goes in `dependencies` ("Knip" in
  `AGENTS.md`); one with install scripts needs an `allowBuilds` entry in
  `pnpm-workspace.yaml`.
- An extension that renders `Renderer.Component.MonacoEditor` adds
  `monaco-editor` to `devDependencies` at the host's version, although it never
  imports it; otherwise the editor's `options` and callback types are `any`
  ("Project Overview" in `AGENTS.md`).

## 4. Verify

```sh
pnpm install
pnpm type:check
pnpm build
pnpm test:unit
pnpm knip:check
pnpm lint:check
pnpm trunk:check
```

All of them pass. `dist/` then has `main.js`, `renderer.js` and one
stylesheet, `renderer.css`, with their source maps. `pnpm knip:check` fails on
a file nothing imports, such as a leftover module or barrel, or the
`available-version.*` files when no page uses them: remove the file rather than
ignore it in `knip.jsonc`.

Then run the extension in Freelens, as "From a directory" and "Development
loop" in the template's `README.md` describe: install the checkout's directory
from the Extensions page and run `pnpm dev`. Open every page, details panel,
menu item and preference the extension registers, and check that neither the
renderer's DevTools console nor the terminal running Freelens shows an error.
To run these checks through an agent attached to Freelens dev, follow
"Checking the Extension in Freelens Dev" in the template's `AGENTS.md`.

The integration tests are a pattern of the template, not a contract of the
extension API. Keep them, or remove them as a whole: `integration/`,
`vitest.integration.config.ts`, `.github/workflows/integration-tests.yaml`, the
`playwright` devDependency, the `test:integration` and
`type:check:integration` scripts, and their entries in `knip.jsonc`. Kept, they
are the preferred way to test the extension in Freelens: Freelens dev, which
`pnpm dev` of a freelensapp/freelens checkout starts, driven with Playwright
over CDP, and run with `pnpm test:integration` ("Workflows" in `AGENTS.md`).

The CRD sessions add a kubectl pattern for custom resources, which is
destructive: it deletes the CRD and every object of it on the cluster, and the
sessions install the checkout in the Freelens dev profile in place of any other
installation of the extension. Run them in a sandbox: a kind cluster with
nothing worth keeping, named in every kubectl call, never a shared or
production context, and a fresh profile in CI.

An extension with a page that loads stores of its own, such as an overview or
a dashboard, opens that page as the first view of a session, right after the
cluster is connected. Opened after the list pages, it finds their stores
loaded and passes even when it loads nothing itself, which is how an effect
that breaks under `React.StrictMode` goes unnoticed ("Rules That Fail
Silently" in `AGENTS.md`).

A gap or an error in the Freelens documents, in `@freelensapp/extensions` or in
this skill is reported to
[freelensapp/freelens](https://github.com/freelensapp/freelens/issues), and one
in the template to
[freelensapp/freelens-example-extension](https://github.com/freelensapp/freelens-example-extension/issues),
rather than worked around in the extension without a word.
