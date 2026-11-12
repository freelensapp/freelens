---
name: port-extension-to-v2
description: Port an existing Freelens extension written for the v1 extension API (the API inherited from Lens and OpenLens) to the Freelens v2 extension API, so that it loads on Freelens 2.x. Use when an extension declares engines.freelens ^1.x or depends on @freelensapp/extensions 1.x and the user wants it on v2. Plans the port as a migration issue, from the template that comes with this skill, and feature issues, aligns the toolchain and build with that reference template, lets the type check drive the API changes, and verifies the result in Freelens.
license: MIT
compatibility: Needs network access to github.com and raw.githubusercontent.com for the linked documents and issues, the gh CLI to read and open issues, and Node.js with pnpm (through corepack) to build and check the extension.
---

# Port a Freelens extension to v2

An extension needs this port when its `package.json` declares
`engines.freelens` as `^1.x` or depends on `@freelensapp/extensions` 1.x.
Freelens v2 breaks the v1 extension API on purpose, and it refuses such an
extension at discovery, before any of its code runs.

This skill is the workflow. The documents below are the source of truth: read
the sections each step names instead of relying on memory of the v1 API.

## Documents

Fetch the raw URLs; they return Markdown. Read the issues and the pull request
with `gh`, which returns their source, as in step 1.

| Document                                                                                                                     | Read it for                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`migrating-from-v1.md`](https://raw.githubusercontent.com/freelensapp/freelens/v2.0.0/docs/extensions/migrating-from-v1.md) | The porting guide: what changed and what replaces it, the "v1→v2 rename table" and the "Checklist" at the end.                            |
| [`api.md`](https://raw.githubusercontent.com/freelensapp/freelens/v2.0.0/docs/extensions/api.md)                             | The normative contracts C1 to C15: what the host guarantees and how a violation fails. C15 is for an extension that runs kubectl or helm. |
| [`binaries.md`](https://raw.githubusercontent.com/freelensapp/freelens/v2.0.0/docs/extensions/binaries.md)                   | Only for an extension that ships executables.                                                                                             |
| [`AGENTS.md`](https://raw.githubusercontent.com/freelensapp/freelens-example-extension/main/AGENTS.md) of the template       | The build, type-check, test, lint and CI patterns of a v2 extension, each with its reason, and "Rules That Fail Silently".                |
| [`README.md`](https://raw.githubusercontent.com/freelensapp/freelens-example-extension/main/README.md) of the template       | Installing an extension in Freelens and the development loop.                                                                             |
| [The source tree](https://github.com/freelensapp/freelens-example-extension/tree/main) of the template                       | The worked example of a v2 extension.                                                                                                     |
| [`references/migration-issue.md`](references/migration-issue.md)                                                             | The template of the migration issue: the plan of a v2 migration, with the project-specific sections to fill in.                           |
| [freelensapp/freelens-example-extension#326](https://github.com/freelensapp/freelens-example-extension/issues/326)           | The same plan carried out for the template: a worked example of a completed migration issue, with its findings.                           |
| [freelensapp/freelens-example-extension#327](https://github.com/freelensapp/freelens-example-extension/issues/327)           | A worked example of a feature issue: the port of one feature, the `Example` CRD.                                                          |
| [freelensapp/freelens-example-extension#336](https://github.com/freelensapp/freelens-example-extension/pull/336)             | The pull request that ported that feature, with its functional checks.                                                                    |

## 1. Plan the port in two kinds of issue

Open both in the extension's own repository.

**The migration issue** covers the extension itself: manifest, build,
TypeScript layout, tests, CI, documentation and the components its features
share. Its body is the template
[`references/migration-issue.md`](references/migration-issue.md) of this skill,
next to this file. Copy it as it is; its sections marked
**(generic)** stay as written, and every item starts unticked.
freelensapp/freelens-example-extension#326 is the same plan carried out for
the template itself: read it for what a filled-in inventory, a step report
and a finding look like, not to copy it.

- Check the pin of "Source of truth" first: a Freelens release tag, and the
  `@freelensapp/extensions` release of the same version. It is never older
  than what this skill and the documents it links to require. The template's
  own `package.json` names the release the template is checked against; a pin
  older than that is a sign. When the pin is older, move it in the issue to
  that release, with the versions of "Stack alignment" as Freelens has them
  there, record the move under "Findings" of the issue, and report the stale
  pin to freelensapp/freelens, where this skill lives.
- Fill in every `(to fill in: ...)` placeholder, so that none is left when the
  issue is opened. They are the sections marked **(project-specific)**:
  "Inventory" (every v1 construct in the repository, with its v2 requirement
  and the API symbols to check), "Functional checks" and "Decisions", and the
  feature issues of the template note. The findings of earlier ports are
  already folded into the generic sections; "Findings" starts empty.
- In "Inventory", answer in its "HTTP and cluster access" row how the
  extension makes HTTP requests and how it reaches a cluster, in main and in
  the renderer, with "none" when it does neither. A v1 client still works in
  v2 on a plain network, so nothing points at it, but it goes around the
  cluster's proxy setting and everything else Freelens does for the cluster,
  so the port does not find it by itself; search for `fetch(`, bundled HTTP and
  Kubernetes clients, `kubeConfigPath`, and spawned `kubectl` or `helm`. The
  v2 answers (C12 in `api.md`):
  - HTTP outside a cluster: in main `Main.Util.fetch`, also given as the
    `fetch` option of a bundled library that takes one (an SDK, an MCP
    transport), not `globalThis.fetch` or a bundled client; in the renderer
    the global `fetch`, Chromium's, which the host uses there too;
  - a catalog cluster: `K8sApi.forCluster` for a `KubeApi` of one kind, or
    `K8sApi.KubeJsonApi.forCluster` for requests by path, not a client built
    from the cluster's `kubeConfigPath` ("Reaching a catalog cluster" in
    `migrating-from-v1.md`);
  - kubectl or helm: the host's, through `Main.Shell` (C15): the paths of
    `getKubectlPath` and `getHelmPath`, run with `getEnvironment` as the
    environment, not a binary found by name or given the raw kubeconfig.
- "Decisions" settles at least the version of the extension, its integration
  tests (kept on the template's pattern, with the Freelens ref they run
  against, or none; "Integration tests" below), and how the port lands: in one
  PR, or in stages on a branch that nothing is released from, as the
  template's port landed on `main`; and how its pull requests are merged
  (squash, merge commit or rebase), which "Rules for the CI agent" refers to
  rather than assumes.
- A short reference such as `#328` resolves in the repository it is written
  in. The template writes the issues and pull requests of
  freelensapp/freelens-example-extension in full; write any that the issue
  adds the same way.
- Keep the Claude handle split as `@<!-- -->claude`, as the template has it:
  an issue whose body contains the handle starts the Claude workflow when it
  is opened, and so does a comment that contains it, in a repository that has
  one.

**One feature issue per feature.** Each lists its scope, the v1 constructs and
API symbols it uses, its steps with a prefix of its own (`E1`, `E2`, ...) and
its functional checks. Keeping the features out of the migration issue keeps
that issue to what every extension has; its "Rules for the CI agent" say how
the two are worked on together. Two kinds of feature have a pattern:

- **A custom resource**, with its models, pages, details and menu items, or
  another view of the extension, as #327 is for the `Example` CRD. Its steps
  follow "Adding an API" in `AGENTS.md`, and its checks include the Custom
  Resources tree of the `customResources` item.
- **A feature in the main process**: a local server (an HTTP bridge, a
  socket), spawned processes, a bundled Node library such as
  `@kubernetes/client-node`. freelensapp/freelens-for-claude-extension#73 is
  one. Its steps cover:
  - the ESM main: no `require`, `__dirname` or `module.exports` of its own
    left, its files located with `this.manifestPath`, and every bundled
    CommonJS library loading from `dist/main.js`, which needs the `node`
    platform and the `__dirname` definition of "Process-specific settings"
    in `AGENTS.md`;
  - the lifecycle: what `onActivate` starts, `onDeactivate` stops, because a
    reload runs `onDeactivate` before the new build's `onActivate` ("The
    development loop" in `migrating-from-v1.md`), and a server still bound to
    its port or a child process left running survives it;
  - HTTP and cluster access, as the "HTTP and cluster access" row of the
    migration issue's inventory gives them;
  - the channel between the renderer and main: IPC (`Main.Ipc.handle` and
    `Renderer.Ipc.invoke`) for short request/response exchanges, and a local
    HTTP server for a stream or the bulk of the traffic. The extension API has
    no send to a single frame: `Ipc.broadcast` reaches every frame of every
    window, so per-cluster data sent that way reaches the frames of other
    clusters, while an HTTP request gives each frame a stream of its own. A
    secret such as the server's bearer token goes over `invoke`, not into an
    `ExtensionStore`, which the host syncs to every frame and saves to disk,
    and which keeps a key once saved. freelensapp/freelens-for-claude-extension#106
    hands its bridge token over that way;
  - a spawned kubectl or helm through `Main.Shell` (C15), and a shipped
    executable after `binaries.md`.

  Its functional checks: the server answers and the processes run once the
  extension is enabled, both are gone after it is disabled, a rebuild under
  `pnpm dev` leaves exactly one of each, and the main-process log has no error.
  Such a feature registers no model, so the `customResources` item of
  "Validation by maintainers" does not apply to it.

**Before the first trigger comment**, compare the job that runs the agent in
the repository's `.github/workflows/claude.yaml` with the `claude` job of the
[template's](https://github.com/freelensapp/freelens-example-extension/blob/main/.github/workflows/claude.yaml):
its `--max-turns` (400 there) and its `timeout-minutes` (120 there). A run
stops at whichever it reaches first, and "Rules for the CI agent" of the
migration issue asks for a set of steps that fits in one run, so a comment
sized for the template's limits ends in the middle of a step under lower ones,
as the first run of freelensapp/freelens-ai-extension did at 200 turns. Either
raise both to the template's values, in a commit of their own before the
first run, or size the trigger comments to the repository's values.

## 2. Order of work

1. **Manifest.** Bump `engines.freelens` to `^2.0.0` first: until then the
   host refuses the extension, and nothing else is observable ("Step one: bump
   `engines.freelens`" in `migrating-from-v1.md`). Install the exact
   `@freelensapp/extensions` version that "Source of truth" in the migration
   issue names, and set `"type": "module"` ("`package.json` for an
   extension").
2. **Toolchain and build.** Align them with the template as it is on its
   current `main`: take the files that
   [`create-extension`](../create-extension/SKILL.md) lists under "Keep as
   is", the dependency versions of the template's
   `package.json`, and its scripts. Where a version there is ahead of the one
   "Stack alignment" in the migration issue pins, keep the file and set the
   pinned version, and say so in the PR. Never take the files from an older
   commit of the template to match the pin: that also drops the template's
   changes that do not depend on it. The template renders no
   `Renderer.Component.MonacoEditor`; an extension that does declares
   `monaco-editor` in `devDependencies`, at the host's version, for the
   editor's types, even when its v1 `package.json` did not list it ("Project
   Overview" in `AGENTS.md`). Move the code into
   `src/main/`, `src/renderer/` and `src/common/`, one TypeScript program each
   ("Source layout: one tsconfig per runtime environment" in
   `migrating-from-v1.md`, "Build" and "TypeScript" in `AGENTS.md`). Remove
   whatever only the v1 build needed: the bundler configuration, the global
   externals, legacy decorator plugins.
3. **API changes.** Let `pnpm type:check` drive them. Look every error up in
   the "v1→v2 rename table" of `migrating-from-v1.md` and follow the section it
   links. Decorators follow "MobX 7 and mobx-react 10 (standard decorators
   only)", stylesheets "Styling and CSS", and Node or Electron in renderer code
   "Node and Electron in the renderer".
4. **Features.** One feature issue at a time: a custom resource or a view after
   "CRD KubeObject Pattern" and "Renderer Components" in `AGENTS.md`, a feature
   in the main process after its pattern in step 1.
5. **Functional check in Freelens**, as in "Verify" below.

## 3. What compiles and fails at runtime

The type check does not catch everything a v1 extension gets wrong on v2.
Check the port against:

- "Rules That Fail Silently" in `AGENTS.md`: a second copy of React or mobx,
  `@observable` without `accessor`, Node or Electron in renderer code, a CSS
  asset other than `dist/renderer.css`, an instance method on a KubeObject
  subclass, a cluster page that expects more than `params`, a version choice
  through `getStore()` in a component that is not an `observer`, `this.props`
  of an `@observer` class component read outside its `render()`, an
  `AbortController` or a list of watches kept in a ref across runs of an
  effect, a page, details panel or menu item outside an error boundary, a
  CommonJS `main`.
- The extension's effects that load stores themselves, as an overview or a
  dashboard does. Search for `useRef` holding an `AbortController`, or the
  disposers of `subscribe()`, that an effect's cleanup aborts or releases.
  Freelens dev renders in `React.StrictMode`, which runs the effect, cleans it
  up and runs it again on the same instance: the second run loads with a
  signal that is already aborted, the host takes that for no failure, and the
  view shows nothing without an error. Create the controller and the list of
  watches inside the effect ("Rules That Fail Silently" in `AGENTS.md`).
- The extension's own version choice. An extension that already has a copy of
  `createAvailableVersionPage`, or another component that picks the served API
  version through `getStore()`, keeps it from before the port, and it is
  usually a plain function component. Make it an `observer`, or replace the
  copy with the template's `src/renderer/components/available-version.tsx`
  and its test: otherwise a page that renders before the cluster frame has
  loaded the CRDs, as a page Freelens restores when a cluster is opened does,
  shows the kind as not installed ("CRD KubeObject Pattern" in `AGENTS.md`).
- The extension's `@observer` class components. Under v1 they could read
  `this.props` anywhere; under mobx-react 10 only their own `render()` may.
  Search for `this.props` in `@computed` getters and in the methods passed to
  the host, such as `getItems` and `customizeHeader` of
  `KubeObjectListLayout`: each throws
  `[mobx-react] Cannot read "X.props" in a reactive context` when the page
  renders, and the host shows "App crash". Read the values in `render()` and
  hand them to the callback, or make the component a function component
  ("MobX 7 and mobx-react 10 (standard decorators only)" in
  `migrating-from-v1.md`).
- The porting hint in "Renderer Components" in `AGENTS.md`: the `clusterPages`
  and `globalPages` registrations that compiled under v1 and get `undefined`
  props on v2, and how to pass the extension from the registration instead.
- The `kubeObjectDetailItems` and `kubeObjectMenuItems` registrations. A v1
  registration with `kind` and `apiVersions` written out still compiles, and
  so does one that pairs a component with the model of another version.
  Replace each with `Renderer.K8sApi.detailsFor` or
  `Renderer.K8sApi.menuItemFor` and the model class, and declare the instance
  `kind` and `apiVersion` of every model as literals, without which two
  versions of one kind are not told apart. A menu item whose props extend
  `Renderer.Component.KubeObjectMenuProps` compiles too; make it extend
  `Common.Types.KubeObjectMenuItemProps`, the props the host passes ("CRD
  KubeObject Pattern" and "Renderer Components" in `AGENTS.md`).
- The error boundary. A v1 extension that keeps an error in its place with a
  `try`/`catch` around the call of a component, such as the template's former
  `withErrorPage`, catches only what that call throws: an error that a child
  throws when React renders it, or that a callback such as
  `renderTableContents` throws from the host's `KubeObjectListLayout`, replaces
  the main area, or from a details panel or a menu item the whole cluster view.
  Copy the template's `src/renderer/components/error-boundary.tsx` and its test,
  map `clusterPages`, `globalPages`, `kubeObjectDetailItems` and
  `kubeObjectMenuItems` through its wrappers, and remove the `try`/`catch`
  wrapper ("Renderer Components" and "Rules That Fail Silently" in
  `AGENTS.md`).
- The "Checklist" at the end of `migrating-from-v1.md`, including the two items
  it marks as failing silently.

## 4. Findings

Work on the extension, never around Freelens:

- A gap or an error in the Freelens documents or in `@freelensapp/extensions`,
  such as a symbol that is missing from the API namespaces, a type that does not
  match what the host passes, or a document that contradicts the declaration,
  is reported to [freelensapp/freelens](https://github.com/freelensapp/freelens/issues),
  and recorded under "Findings" and "Upstream work item" of the migration issue.
  It is not worked around silently in the extension, with `as any`,
  `globalThis.require` or a reach into the host's internals.
- A finding of the migration issue that applies to any port is reported to
  [freelensapp/freelens](https://github.com/freelensapp/freelens/issues), so
  that this skill or `references/migration-issue.md` is changed for the ports
  after this one. A gap in the template's files is reported to
  [freelensapp/freelens-example-extension](https://github.com/freelensapp/freelens-example-extension/issues).

## 5. Verify

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
a file nothing imports, such as a leftover v1 module or barrel, or the
`available-version.*` files when no page uses them: remove the file rather than
ignore it in `knip.jsonc`.

Then run the extension in Freelens 2.x, as "From a directory" and "Development
loop" in the template's `README.md` describe: install the checkout's directory
from the Extensions page and run `pnpm dev`. The Extensions page lists it as
enabled. Open every page, details panel, menu item and preference the
extension registers, and check that neither the renderer's DevTools console nor
the terminal running Freelens shows an error. Make one change through mobx,
such as a preference, and check that the UI follows it: that proves the
extension uses the host's mobx. Check that every custom resource listed in
`customResources` is gone from the Custom Resources tree of the cluster
sidebar, and that the log has no error rejecting one of its entries; an
extension that presents no custom resource sets no `customResources`, and its
item in "Validation by maintainers" says so. Then tick the functional checks of
the migration issue and of each feature issue.
To run these checks through an agent attached to Freelens dev, follow
"Checking the Extension in Freelens Dev" in the template's `AGENTS.md`.

### Integration tests

Integration tests are a pattern of the template, not a contract of the
extension API: a port may keep them, add them or leave them out. The preferred
way is the template's: Vitest in the extension's own repository, driving
Freelens dev, which `pnpm dev` of a freelensapp/freelens checkout starts, with
Playwright attached over CDP ("Workflows" in the template's `AGENTS.md`). v1
tests that run inside a Freelens checkout, under its Vitest, with its
`helpers/` and a packaged app started through `_electron`, are rewritten onto
the template's `integration/` rather than ported as they are.

An extension with custom resources can also take the kubectl pattern of the
template's CRD sessions, which apply a CRD and its test objects to a kind
cluster and delete them again. Such tests are destructive: they delete the CRD
and every object of it on the cluster, and they install the checkout in the
Freelens dev profile in place of any other installation of the extension. Run
them in a sandbox: a kind cluster with nothing worth keeping, named in every
kubectl call, never a shared or production context, and a fresh profile in CI.

An extension with a page that loads stores of its own, such as an overview or
a dashboard, opens that page as the first view of a session, right after the
cluster is connected. Opened after the list pages, it finds their stores
loaded and passes even when it loads nothing itself, which is how an effect
that breaks under `React.StrictMode` goes unnoticed ("Rules That Fail
Silently" in the template's `AGENTS.md`).
