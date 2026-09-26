# Freelens v2 extension API — contracts

This is the **normative** half of the v2 extension specification: what the host
guarantees, what surface an extension may rely on, and what happens when a
contract is violated. The developer-facing porting guide is
[`docs/v2-extension-migration.md`](./v2-extension-migration.md); the binary side
is [`docs/v2-extension-abi.md`](./v2-extension-abi.md).

v2 breaks v1 compatibility on purpose (see [`docs/v2-plan.md`](./v2-plan.md),
decisions **D2** and **D5**). **No compatibility is promised for v1 extensions.**
The migration guide is what they get instead.

## How to read this document

Each contract states four things:

- **Guarantee** — what the host promises.
- **Surface** — the stable names the guarantee is expressed in.
- **Failure mode** — what an author sees when the contract is violated. This is
  recorded because most of these fail at runtime rather than at build time, and
  several fail *silently*.
- **Status** — `shipped` when the code matches this document, or the issue that
  makes it match.

Anything not stated here is not part of the contract. Extensions run with full
privileges and can reach much more than this document describes; reaching it is
not supported, and it may change without notice.

**On the `docs/v2-*` naming.** It stays until the v2 implementation lands. This
tree is working material, organised for whoever is building the thing; once
there is a shipped implementation to describe, the extension documentation gets
a structure built for extension authors instead, and these three files are its
input rather than its final shape.

---

## C1. Packaging and publication

**Guarantee.** `@freelensapp/extensions` is the **only** published package of
this repository. Every other `@freelensapp/*` package is private and must never
appear in an extension's dependencies.

**Surface.** One package, two files: `dist/extension-api.d.ts` (the rolled-up
declaration, 13,038 lines) and `dist/extension-api.js` (the runtime shim, 734
bytes, no dependencies).

The rollup is what makes the single-package model work rather than merely
assert it: `rollup.dts.config.mjs` maps all 39 workspace entries to their
emitted declarations and its `external` predicate returns false for them, so
every `@freelensapp/*` is inlined. Nothing else needs publishing.

**Failure mode.** A direct dependency on any other `@freelensapp/*` package
fails to install — the package does not exist on the registry.

**Consequence worth stating separately.** Because workspace packages are private
*and* inlined, **a symbol the API namespaces do not re-export is unreachable by
any means.** There is no package left to install and a type-only import fails at
module resolution with no `@types/` fallback. Re-export completeness is
therefore a correctness property, not a convenience. See [C5](#c5-namespace-enumeration).

**Status:** shipped. The publication pipeline was repaired in #2363.

---

## C2. The runtime-global API

**Guarantee.** The host assigns one object at startup, in each process:

```ts
// main      (freelens/src/main/index.ts:75)
globalThis.FreelensExtensionApi = { Common, Main, ...mainExtensionApiSingletons };
// renderer  (freelens/src/renderer/index.ts:91)
globalThis.FreelensExtensionApi = { Common, Renderer, ...rendererExtensionApiSingletons };
```

The singletons of [C3](#c3-host-provided-singletons) ride on the same object
rather than on globals of their own: one object to publish, one place in the
contract, and it is what the shim already reads.

`@freelensapp/extensions` is a thin shim that re-exports that global, so the
members resolve identically whether an extension inlines the shim or marks it
external. The import specifier does not change from v1:

```ts
import { Common, Main, Renderer } from "@freelensapp/extensions";
```

**Surface.** `Common`, `Main`, `Renderer` — as values and as type namespaces
(`Renderer.Component.IconProps`, `Common.PackageJson`).

**Failure mode.** The wrong-process namespace is `undefined` **at runtime**
while the types expose the full surface, so `Main.Util.fetch` in a renderer
entry type-checks and throws `Cannot read properties of undefined`. Touch only
the namespace for the process your code runs in.

**Status:** shipped.

---

## C3. Host-provided singletons

**Guarantee.** The host publishes its singleton libraries on the **same** global
object. An extension declares them in `devDependencies` for compilation only,
marks them external, and lets its bundler rewrite the bare id to the global.

**Surface.** A closed list of eight module ids:

| Module id | Global | Published in |
| --- | --- | --- |
| `react` | `React` | renderer |
| `react-dom` | `ReactDom` | renderer |
| `react/jsx-runtime` | `ReactJsxRuntime` | renderer |
| `mobx` | `Mobx` | both |
| `mobx-react` | `MobxReact` | renderer |
| `monaco-editor` | `MonacoEditor` | renderer |
| `@ogre-tools/injectable` | `OgreToolsInjectable` | both |
| `@ogre-tools/injectable-react` | `OgreToolsInjectableReact` | renderer |

**Each process publishes the set it has**, which is why the third column exists.
Publishing all eight in main would pull a DOM renderer and a code editor into a
bundle with no window to render into, for an entry point that cannot use them
either; `@ogre-tools/injectable-react` is left out of main on the same ground,
being a React binding. What main has is what an extension's main entry point can
really share: `mobx`, where an extension's stores and catalog entities live, and
`@ogre-tools/injectable`.

**Membership is testable, not editorial: a package belongs on this list if two
instances of it misbehave.** React (hook and reconciler identity), mobx
(observable identity), ogre-tools (container and registry identity), monaco
(global theme and worker registration). Nothing else in the API's dependency set
meets it.

**The names follow a mechanical rule rather than a lookup table:** strip the
scope, split on `-`, `/` and `.`, upper-case each segment. Canonical names would
need an exception table — mobx's own UMD global is lower-case and ogre-tools has
none — and the rule is machine-checkable in both directions: the host asserts its
keys match the transform of the module ids, and a bundler plugin *derives* each
name instead of being handed a map. It settles `ReactDom` over `ReactDOM` in
favour of what published extensions already write.

Three ids leave the map **explicitly**, because dropping them silently is the
error:

- **`@freelensapp/extensions`** — mapped in v1, when the package was a fat
  re-export of core. In v2 it is 734 bytes that already read the global, so
  bundling it is correct.
- **`react-router` and `react-router-dom`** — removed from the host in #2261.
  Both were v1 globals: the renderer entry's `ReactRouter` and `ReactRouterDom`
  exports went with the dependencies in #2270. An extension still mapping either
  gets `undefined` at runtime, not a build error.
- **`node-pty`** — main's v1 entry exported `Pty`, but no v2 build has assigned
  that global. What made the v1 exports into globals was webpack's
  `libraryTarget: "global"`; #2118 replaced it with a Rollup `es`-format library
  build, whose `export` statements nothing imports because Electron runs main as
  the process entry point. No published extension externalises it either.
  Publishing the namespace would hand out live `IPty` handles into processes the
  host owns the lifetime of, which makes a pty a supervised host API — option 3
  of [`v2-extension-abi.md`](./v2-extension-abi.md) — rather than a map entry;
  an extension that needs to run a program uses `node:child_process`. The rule
  would name it `NodePty` in any case.

**Failure mode.** Bundling your own copy of a listed package. React throws
`invalid hook call`; ogre-tools fails to find registrations; **mobx fails
silently** — two instances interoperate through shared global state well enough
that observables appear to work and reactions simply do not fire where they
should. A typo in a global name yields `undefined`, not a build error.

**Status:** shipped in #2450. It had been a regression rather than an omission.
What made the v1 entries' exports into globals was webpack's **output format**:
both entry configs set `libraryTarget: "global"` with no library name, which
assigns each export onto `global`. #2118 replaced webpack with electron-vite,
and neither of its outputs does that — the renderer became an app
(`rollupOptions.input: src/renderer/index.html`), while main is *still* a
library build (`lib: { entry, formats: ["es"] }`) that simply emits ESM `export`
statements nothing imports, because Electron runs it as the process entry point.
So nothing assigned the globals for the whole of the v2 line until the
singletons moved onto the API object. The orphaned v1 exports in the two process
entries went with that change; the unreferenced
`packages/core/src/renderer/extension-api.ts` is still there for the #2134
sweep.

Library versus app is the wrong axis here, and it is worth stating because the
mistake is natural: a Rollup library build in `es` format publishes nothing to
`globalThis` either. The global library target was the mechanism, and it is gone
from both processes.

The maps live in `packages/core/src/extensions/api-globals/`, one per process,
each paired with the module id of every name it publishes. Membership cannot
drift between the two objects — the id map is typed `Record<keyof …, string>` —
and a name cannot drift from the rule: `assertExtensionApiSingletonNames` checks
every key against `globalNameForModuleId` at startup, and a unit test runs the
same assertion over both maps so a typo fails in CI without launching the app.

---

## C4. Module format and loading

**Guarantee.**

- **Main** accepts ESM or CommonJS. The host imports the manifest's `main`
  entry from a real file path. **Only ESM reloads**: a development install
  whose `main` was loaded as CommonJS, or whose format changed since it was
  loaded, needs the application restarted to run its new build. Loading it the
  first time is unaffected, which is what this guarantee is about.
- **Renderer** entry points are **ESM**, loaded by URL from the privileged
  `freelens-extension` scheme.
- **Top-level await is allowed.**
- **Renderer code gets no guarantee of Node or Electron**, `require()`
  included. They are reachable only because the renderer is not
  context-isolated, and they may disappear in any release, a minor one included:
  being reachable does not make them part of the surface that
  [C14](#c14-versioning-and-compatibility) freezes. **Main** keeps both.

**Surface.** `main` and `renderer` in the manifest, each a path relative to the
package root. Under URL-based loading the renderer has **no `__dirname`**, which
makes `LensExtension.manifestPath` the only route to an extension's own files —
see [C6](#c6-registration-and-the-extension-instance).

What a renderer entry point may rely on is what a browser page has — `fetch`,
Web Crypto, `TextEncoder` / `TextDecoder`, `Uint8Array` — plus the API object of
[C2](#c2-the-runtime-global-api) and the singletons of
[C3](#c3-host-provided-singletons). Work that needs Node or Electron belongs in
the main entry point, reached over `Renderer.Ipc` / `Main.Ipc`. The migration
guide lists the replacement for each Node and Electron module v1 extensions
used in the renderer, under
[Node and Electron in the renderer](./v2-extension-migration.md#node-and-electron-in-the-renderer).

**Failure mode.** A load failure is recorded in the extension's metadata and
logged; the extension is skipped and nothing else aborts. A renderer bundle
served with a wrong MIME type does not execute at all — the host maps types by
file extension and serves anything unknown as `application/octet-stream`, which
correctly refuses. A rebuild which cannot be reloaded is **refused and logged**,
naming the extension and the reason; the extension goes on running the build it
already has, in both processes, rather than one process moving on without the
other.

Extension code calling `globalThis.require` in the renderer is **warned, not
blocked**: the host logs a deprecation warning once per extension and module
id, and returns the module. Nothing stronger would hold while the renderer is
not context-isolated, since the globals are shared. The warning goes by the
**immediate caller** — the call is the extension's when the frame that made it
is at a `freelens-extension://extensions/<name>/` URL, which also names the
extension. So the host's own calls, and host code an extension calls into, do
not warn; code an extension bundles is part of its file and does. The wrapper
is installed in every frame that loads extensions, cluster frames included,
before the first extension loads.

**Status:** shipped. The renderer imports the served URL and the main process
imports a `file:` URL, both asynchronously, so **top-level await works in either
entry point**. A development install is reloaded when its entry points are
rebuilt: the host tears the extension down through `onDeactivate` and imports it
again under a fresh URL.

That last step is why only an ESM `main` reloads. Node keys its module map by
URL, so the fresh URL is what makes a new module of the rebuilt file — but a
CommonJS module is cached below that by filename, which no URL reaches, and the
format Node resolved for a path is cached with it. So a path once loaded as
CommonJS is frozen as the module it was, for the life of the process, however
the file is rewritten; and a CommonJS build reached through the ESM loader
throws `ReferenceError: module is not defined in ES module scope`. Neither cache
can be evicted, so the host refuses those reloads instead of attempting them.

---

## C5. Namespace enumeration

**Guarantee.** These are the members of each namespace. A symbol not listed here
is not reachable (see [C1](#c1-packaging-and-publication)).

| Namespace | Members |
| --- | --- |
| `Common` | `App`, `Catalog`, `Clusters`, `EventBus`, `LensExtension`, `Proxy`, `Store`, `Types`, `Util`, `logger`; types `InstalledExtension`, `LensExtensionManifest`, `Logger`, `PackageJson` |
| `Main` | `Catalog`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Power`, `Util` |
| `Renderer` | `Catalog`, `Component`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Theme`, `Util` |

Note what is **not** there: there is no `Renderer.React`, no `Renderer.ReactDOM`
and no `Renderer.Registrations`. Earlier drafts of this specification and of the
migration guide named all three; they never existed in v2. React reaches
extensions through [C3](#c3-host-provided-singletons), registrations through
[C6](#c6-registration-and-the-extension-instance).

**Failure mode.** A missing re-export is a compile error with no workaround. The
two known classes of gap are closed in #2365: `K8sApi` now star-exports
`@freelensapp/kube-object`, and the kube-api option and descriptor types that
appear in exported signatures — `KubeApiOptions`, `DerivedKubeApiOptions`,
`KubeObjectStoreOptions`, `KubeApiListOptions`, `KubeApiQueryParams`,
`DeleteOptions`, `PropagationPolicy`, `ResourceDescriptor`, `IKubeWatchEvent` —
are exported alongside `parseKubeApi` and `createKubeApiURL`, so they are
nameable and not merely callable. A third turned up while doing it — four
modules `@freelensapp/kube-object` declares but its own index did not export,
which no namespace change could reach — and is closed in the same PR at the
source; see [the decision below](#decided-k8sapi-star-exports-freelensappkube-object).

### Decided: `K8sApi` star-exports `@freelensapp/kube-object`

The namespace exports **all** of `@freelensapp/kube-object`, not a curated
selection. Before this it re-exported 55 of the 419 symbols the package then
exported, and the missing ones were most of the shared spec vocabulary —
`Affinity`, `Capabilities`, `ContainerPort`, `Probe`, `ResourceRequirements`,
`SecurityContext`, `Toleration` — which is precisely what an extension adding
resource views needs. Two published
extensions already import them from the private package directly, which the
packaging contract forbids, so without this they simply cannot port.

Picking symbols one at a time as authors ask does not scale, and every round
trip is a release an author waits for.

**This interacts with the freeze in [C14](#c14-versioning-and-compatibility),
and the interaction is benign — but only because of what these symbols are.**
By kind: **293 interfaces, 59 type aliases and 12 enums against 50 classes, 15
functions and 2 constants** — the nine added by the index fix below are all
shapes. Roughly 84% of the surface is a *transcription of upstream Kubernetes
API shapes*, whose stability is not ours to promise or to break — it is
inherited from Kubernetes. Freezing those until the next major
costs approximately nothing.

The risk is therefore concentrated in the ~67 behavioural symbols, and that is
where the review effort belongs — a count the index fix does not change:
**skim the classes, functions and constants before the star export lands; do not
spend the time re-reviewing 364 data shapes.**

**One name collision exists, and it is real** — two different types share the
name `KubeObjectStatus`: a Kubernetes resource status shape
(`{ conditions?: BaseKubeObjectCondition[] }`) and the extension-facing status
registration type that extensions register status providers against. The second
keeps the bare name, because v1 extensions already use it.

**The first is renamed on export rather than excluded**, to
**`BaseKubeObjectStatus`** — it is the base that `DeploymentStatus`,
`JobStatus` and the other resource statuses extend, and it carries
`BaseKubeObjectCondition`s. An exclusion is a silent hole — the symbol exists in
the source, is absent from the API, and nothing announces the difference. A
rename is visible in the declaration, and it keeps the
surface complete, which [C1](#c1-packaging-and-publication) makes a correctness
property rather than a preference.

**The star export alone did not reach everything, and the reason is worth
recording.** `SecurityContext`, `PreemptionPolicy`, `JSONSchemaProps` and
`ExternalDocumentation` are declared in `@freelensapp/kube-object` and appear in
the signatures of types it exports (`Container.securityContext`,
`PriorityClass.preemptionPolicy`, the CRD schema), but its own
`src/types/index.ts` did not export the modules that declare them — and
`export *` resolves through a package's own index, so a module the index skips
is invisible to the namespace no matter what the namespace does. The same defect
as the one this decision addresses, one level further down.

It is **fixed at the source** in #2365: `types/index.ts` now exports all four
modules, so the namespace reaches them like everything else. The package is
private, so its export list is not a contract with anything outside this
repository and no type was altered to do it. `json-schema-props` carries five
documented `string` aliases (`UUIDRegexString`, `UUID3RegexString`,
`UUID4RegexString`, `UUID5RegexString`, `CreditCardRegexString`) alongside
`JSONSchemaProps`; they are the `format` vocabulary for the CRD schema and are
frozen with it under [C14](#c14-versioning-and-compatibility).

**Status:** the table above is transcribed from the built
`dist/extension-api.d.ts`, and it is **checked rather than generated**. Three
things keep it honest, none of them a new tool:

- `packages/core/src/extensions/__tests__/extension-api.test.ts` asserts the
  three member lists **exactly** — the table is that list — and then asserts
  only that each sub-namespace exists, is non-empty and still carries a handful
  of anchor symbols.
- `packages/core/src/extensions/__tests__/extension-api.types.ts` names those
  anchors and the types of this section's failure mode **as types**, so a
  symbol that stops being nameable stops `pnpm type:check` compiling.
- `packages/fixture-extension/src/contract-types.ts` does the same against the
  **built** declaration, which is the artifact an author resolves.

**Generating the enumeration was tried and rejected** (#2366, #2476). An API
Extractor report runs against TypeScript 7 output and produces a diffable file,
but it records the *transitive closure* of the surface rather than its
membership: 163 symbols nobody intends as API appeared in it — host-side
dependency bags and internal states reached through a public signature — so
refactoring one of those read as a contract change, while the thing this
section guarantees is which names a namespace has. The report could not tell
"the API broke" from "the API changed", which is the only distinction worth
gating on. The `ae-forgotten-export` occurrences it found are real and remain a
separate matter.

### Decided: `Util` is `@freelensapp/utilities` minus the Node-bound members

`Common.Util` is one family, judged as a whole rather than member by member,
and it is delimited by a rule rather than by a list of what it offers:

- **Every export of `@freelensapp/utilities` is extension API**, and frozen with
  the rest under [C14](#c14-versioning-and-compatibility) — including an export
  added to the package later.
- **Except a member that needs Node or Electron in the renderer**, because
  renderer code gets no guarantee of either ([C4](#c4-module-format-and-loading)). Such a member goes on the omit
  list in `packages/core/src/extensions/common-api/utils.ts`, which
  destructures it out of the spread so that its name and types do not reach
  the bundled declarations either.

`Main.Util` and `Renderer.Util` spread `Common.Util`, so an omitted member is
gone from all three; each adds its own `fetch` ([C12](#c12-http)).
`Common.Util.getAppVersion` is the one member the host defines itself.

**Whoever adds an export to the package** is therefore adding API, and checks
one thing: does it need Node or Electron to run in the renderer — a
`node:`/Electron import, a Node global such as `Buffer` or `process`, or a Node
type such as `NodeJS.ErrnoException` in its signature? If the dependency is
incidental to the implementation, remove it, as was done for `node:assert` in
`unitsToBytes` and `node:util` in `strictGet`; if it is what the function does,
add the member to the omit list and a line to the migration guide.

**Failure mode.** A member that needs Node and is not on the list fails at
runtime in a renderer without Node — a `ReferenceError` for a global such as
`Buffer`, a failed import for a builtin — and not at compile time, because
nothing checks the rule mechanically.

---

## C6. Registration and the extension instance

**Guarantee.** An extension contributes through **declarative fields on its
`LensExtension` subclass**. Host-side registrators translate those fields into
injectables, scoped to the extension and torn down with it.

**Surface.**

`LensRendererExtension` fields: `globalPages`, `clusterPages`,
`clusterPageMenus`, `clusterFrameComponents`, `appPreferences`,
`appPreferenceTabs`, `entitySettings`, `statusBarItems`, `kubeObjectDetailItems`,
`kubeObjectMenuItems`, `kubeWorkloadsOverviewItems`, `commands`, `welcomeMenus`,
`catalogEntityDetailItems`, `topBarItems`, `additionalCategoryColumns`,
`customCategoryViews`, `kubeObjectHandlers`.

`LensMainExtension` fields: `terminalShellEnvModifier`, a function the host
calls with the environment of every terminal it opens. There is no field for the
application menu or the tray: both are the host's own.

`LensExtension` (both processes): `protocolHandlers`; the read-only `id`,
`manifest`, `manifestPath`, `name`, `version`, `description`, `storeName`,
`sanitizedExtensionId`, `isEnabled`; `getExtensionFileFolder()`; and the author
hooks `onActivate()` / `onDeactivate()`.

Two of these deserve emphasis because the loader changes make them load-bearing:

- **`manifestPath`** is how an extension locates its own shipped files. In the
  renderer it is the *only* route, since there is no `__dirname` under URL
  loading.
- **`getExtensionFileFolder()`** returns a writable directory for this extension
  alone, resolved from `storeName` through a hash — so it is **unaffected by
  reinstalls and version changes**, which the install path deliberately is not.
  The folder name is obfuscation, not a security boundary.

**Failure mode.** A field left at its default contributes nothing, silently — a
registration that never appears is the common symptom of a typo in a field name
or of registering after the host has already read the field.

**Status:** shipped, except the registration *moment* — see
[C7](#c7-the-dependency-injection-surface).

---

## C7. The dependency-injection surface

**Guarantee.** **The container stays in the host.** `OgreToolsInjectable` is
exposed so an extension can *create* injectables and use `withInjectables`
against the host's DI context. The container itself and an `inject`-by-token
facade are not exposed.

**Surface.** `@ogre-tools/injectable` 23 and `@ogre-tools/injectable-react` 23,
via [C3](#c3-host-provided-singletons), plus the extension's own namespaced view
of the container.

Two properties are stated plainly rather than implied:

- **It is a namespaced view, not an isolated container.** Registrations get an
  id prefix and are torn down with the extension, but another extension that
  knew the prefixed id could reach them. **No security boundary may be built on
  this.**
- **An extension's injectable can inject anything the host has.** This follows
  from the container being shared, and it is accepted rather than fenced: with
  `contextIsolation: false` an extension already reaches everything through
  `globalThis`, so a restricted container would be theatre until #2399. What is
  supported is what the namespaces expose; anything else may change without
  notice.

**The lifecycle invariant:** *the container exists before the author's first
hook and is released after their last.*

**Failure mode.** Registering an injectable outside that window is lost, without
an error.

**Status:** the invariant holds as of #2450. It did not before: the view came
into existence with the first `getExtension` call, in `loadExtensions`, *after*
`activate()` had run the author's `onActivate` — and `enable()` has no author
hook — so there was no point in the lifecycle at which an extension could
register anything. The loader now injects the view right after it constructs the
instance, and population by the registrators stays after activation, which is
where it has to be (activation can register catalog categories the registrators
must see). Teardown always was correct: `disable()` runs `onDeactivate` before
`deregister()`.

**What is still missing is the author-facing half.** The moment exists; no hook
hands an author a container to register into at it. That is a separate decision,
not a consequence of this one.

**Deferred, with the measurement that justifies deferring it.** The repository
declares **119** injection tokens: **15** are extension-facing, **9** are
consumed inside the namespaces to expose a member (where the member is the
contract and the token need not be public), and the remaining ~95 are internal.
The 15 are not being made public, because doing so buys **no new capability** —
each registrator exists to translate a declarative field, so
extensions already reach every capability the tokens would unlock. Exposing them
would mean re-exporting 15 tokens *and their generic parameter types* out of
private packages. The question returns when someone wants a capability nobody
wishes to write a registrator for, and it will then be a decision about one
token rather than fifteen.

---

## C8. React

**Guarantee.** Host-provided React **19**, reached through
[C3](#c3-host-provided-singletons). Extensions must not bundle their own.

**Surface.** `react`, `react-dom`, `react/jsx-runtime` as externals; `@types/react`
as a devDependency.

**Failure mode.** The invalid-hook-call trap: two copies of React in one renderer
break the Rules of Hooks, and any hook — including those inside host components
an extension renders — throws at runtime. It fails only at runtime, never at
build time.

**Two earlier statements were wrong and are corrected here.** React is not
reached through `Renderer.React`, which does not exist; and the instruction to
"declare `react`/`react-dom` as peers `^19`" described nothing real — **no
published extension declares any peer dependency at all**, and the v1 mechanism
that populated `global.React` is gone.

**Status:** shipped with #2450. Before it, the single-React guarantee held only
by pnpm peer-resolution accident in a development tree, and not at all for an
installed extension.

---

## C9. Routing

**Guarantee.** Navigation runs on the in-house `@freelensapp/routing`. The
`react-router` 5 / `react-router-dom` 5 / `history` 4 re-exports are **removed**
(#2261).

**Surface.** Pages are registered through `globalPages` / `clusterPages`
([C6](#c6-registration-and-the-extension-instance)) and navigated with
`navigateToRoute` and the route helpers. The **v5 path dialect is preserved** —
`/:param?` optionals and inline `/:param(regex)` patterns — by the in-house
`matchPath`, so existing path strings need no rewriting.

**Failure mode.** `import { Link } from "react-router-dom"` through the Freelens
bundle no longer resolves. An extension that wants react-router JSX bundles its
own.

**Status:** shipped. See [`docs/v2-routing-modernization.md`](./v2-routing-modernization.md).

---

## C10. Styling and CSS

**Guarantee.** The host injects an extension's sibling stylesheet — either
`<entry>.css` or a `style.css` next to the renderer entry — so a normal
stylesheet import works without the v1 `?inline` + `<style>` workaround.

**Surface.** One CSS asset next to the renderer entry. The host's shared
component classes (`.Tooltip`, `.Button`, …) are global and part of the public
API and may be targeted; they must not be redefined. An extension's own styles
belong in CSS Modules.

**Failure mode.** A build that splits CSS per module emits assets the host does
not look for, and the extension renders unstyled. **The host's Tailwind does not
reach extensions** — its JIT scans only core's own sources, so an unprefixed
utility class produces no CSS and silently does nothing. An extension may run
its own Tailwind build; see the migration guide.

**Status:** shipped as a `<link>` at the URL main serves the stylesheet from,
which is the same route the renderer entry point takes. `flexbox.scss` is removed
from the host, so its utility classes are inert.

---

## C11. Third-party bundled libraries

**Guarantee.** `catalogs.extensions` in `pnpm-workspace.yaml` is the list of
libraries the published API's type surface is pinned against.

It splits in two:

- **Host-provided** ([C3](#c3-host-provided-singletons)): `react`, `mobx`,
  `monaco-editor`, `@ogre-tools/injectable`, `@ogre-tools/injectable-react`.
- **Free to bundle**: `chart.js`, `react-select`, `conf`, `immer`, `rfc6902`,
  `type-fest` (plus the `@types/*` entries). A bundled `react-select` still gets
  the host's React, because that copy's own `import "react"` is rewritten too.

**Surface.** The built declaration imports these external specifiers:
`type-fest`, `mobx`, `mobx-react`, `react`, `react/jsx-runtime`, `react-dom`,
`conf`, `rfc6902`, `immer`, `@ogre-tools/injectable`,
`@ogre-tools/injectable-react`, `es-toolkit/compat`, `monaco-editor`,
`chart.js`, `react-select`.

This is the complement of the namespace enumeration in
[C5](#c5-namespace-enumeration): that records what the API *exports*, this what
it *imports* and therefore imposes on an author. It is read off the built
bundle, not the source tree:

```sh
pnpm --filter @freelensapp/extensions build:dist
rg -o "from '([^']+)'" -r '$1' packages/extensions/dist/extension-api.d.ts | sort -u
```

The quoting matters and is the reason an earlier count was low: rollup emits
**single** quotes, so a pattern written against double quotes matches only the
examples inside doc comments and reports nothing. The bundle inlines every
`@freelensapp/*` package ([C1](#c1-packaging-and-publication)), so everything
the command prints is external by construction.

Nothing is imported from `electron`. What the declaration names of Electron it
names through the ambient `Electron` namespace, in the `Main.Ipc` signatures and
the `Common.Types` aliases of the main-process IPC events.

One discrepancy between that list and the declared dependencies, recorded
because it is the kind that rots quietly: **`es-toolkit/compat` is undeclared** —
the published type surface names a package the package does not depend on.

Another is closed: `@ogre-tools/injectable-react` used to be declared but never
named by the declaration, and the bundle now imports it like the other
host-provided singletons. It would have stayed either way, being needed at
*runtime* for `withInjectables`, which is a different requirement from
appearing in the types.

**Failure mode.** A host-provided library in `dependencies` of
`@freelensapp/extensions` **silently plants a real React in the author's tree**
for their bundler to find — which is precisely the mistake
[C3](#c3-host-provided-singletons) exists to prevent. As peers they are still
there to compile against, and bundling one's own copy becomes a deliberate act.

**Status:** the five host-provided entries moved to `peerDependencies` in #2450,
each **optional** in `peerDependenciesMeta` alongside `electron`. Optional
because npm 7+ and pnpm install missing peers by default, so a required peer
would install all five into every author's tree whether imported or not — and
`monaco-editor` alone is 99 MB, which an extension with only a `main` entry
point would pay on every install and in every CI cache. What keeps a second copy
out of the bundle is the author marking the specifier external, not the
dependency field; the field only decides what gets installed. The `@types/*`
entries stayed in `dependencies`: a second copy of a declaration is not a second
instance of anything.

`react-dom` and `mobx-react` are in neither the catalog nor the package's
dependencies, so an extension using them supplies its own devDependency — which
resolves both the two specifiers the ambient global declaration names and the
two the bundled declaration imports. Nothing in-repo type-checks the published
declaration without `skipLibCheck`, the fixture extension included.

---

## C12. HTTP

**Guarantee.** Extensions get HTTP **from the host**, not from a bundled client:
`Main.Util.fetch` and `Renderer.Util.fetch`.

**Surface.** Two symbols, deliberately, because the implementations genuinely
differ per process — one name would suggest an equivalence that does not hold.
`Main.Util.fetch` applies the user's `httpsProxy` preference, their
`caCertificates` and `allowUntrustedCAs` settings and the Freelens proxy;
`Renderer.Util.fetch` is Chromium's `fetch` reached through the host.

Request and response types are **structural**, so neither `undici` nor a DOM
type is imposed on an extension.

**Failure mode.** `globalThis.fetch` in main exists but knows nothing about the
user's proxy or custom CAs, so an extension using it simply fails on corporate
networks. `res instanceof Response` is not a reliable check in main.

**Status:** shipped (#2395).

---

## C13. Consumer toolchain floors

**Guarantee.** The published declaration compiles in a consumer project that
meets these floors. **The floor is stated per surface area, not as one number
for the package** — #2396 showed the two diverge.

**Surface.**

| Requirement | Why |
| --- | --- |
| `"skipLibCheck": true` | the type dependency graph is not clean under `false`, and checking it is not an author's job |
| `"lib"` including `DOM` and `DOM.Iterable`, `ES2024` or newer | the React component types name DOM types nothing else declares; mobx 6.15 names `ReadonlySetLike`, which first appears in the ES2024 lib |
| `"moduleResolution": "bundler"`, `node16` or `nodenext` | to resolve the package's `exports` |
| `electron` as a devDependency | an **optional** peer — a hard dependency would download the Electron binary into every extension install |

The **fetch surface alone** needs `lib.dom` *or* `@types/node`: with structural
types it names only `AbortSignal`, `ReadableStream`, `URL` and `Uint8Array`,
which both declare. The package as a whole still requires `lib.dom`.

**Failure mode.** Missing `skipLibCheck` produces errors in transitive type
dependencies an author cannot fix; a missing DOM lib produces unresolved-name
errors in the React component types.

**Status:** shipped.

---

## C14. Versioning and compatibility

**Guarantee.** `engines.freelens` is the **enforced gate**, checked at discovery
before any extension code runs — and it is the *only* enforced one. The version
range an extension declares for `@freelensapp/extensions` is a compile-time
convenience that the host never reads.

**The published package version is the application version.** They are not two
axes: `pnpm bump-version` moves the whole workspace at once, and
`extensionApiVersion` is read from the `packages/core` version with its
prerelease stripped. The consequence is the policy:

> **A breaking change to this API may ship only in a major release of the
> application.**

**Surface — the gate's exact semantics**, because two of them are traps:

- Only **MAJOR.MINOR** are read from the declaration, and the range is rebuilt
  as `^major.minor`. So `^2.0` means "any 2.x from 2.0 up" and `^2.3` means
  "needs at least 2.3" — an extension can require a minimum minor.
- **The patch is ignored.** `^2.0.5` is treated as `^2.0`; an extension cannot
  require a patch release and must not try to.
- The declaration must start with `^` or a digit. Anything else throws at
  discovery with an explanatory error rather than being silently refused.

**Failure mode.** `isCompatible: false` at discovery. **All 24 published
extensions are already refused on v2** without a line of code being written,
which is why bumping `engines.freelens` is step one of the migration guide and
not a footnote.

"Not loaded" has several distinct causes and the UI distinguishes them, because
the remedy differs: incompatible (`isCompatible`), deliberately disabled
(`isEnabled`), or failed to load.

### Stability: everything exported is public

There is **no unstable tier**. Until a mechanism exists to mark one — TSDoc
`@public` / `@beta` / `@internal` with trimmed rollup variants was the proposal
in #2366, and it is deferred rather than pending — every symbol the namespaces
re-export is public and stable **for the lifetime of the major**.

This cuts towards the host, not the author, and it is the reason these documents
were written before the implementation rather than after it: **whatever 2.0.0
ships is frozen until 3.0.0.** A symbol exported by accident is not retractable
in 2.1. Adding a `@beta` tier later is additive and can wait; exporting first and
deciding later cannot.

Deprecation within a major: mark with `@deprecated`, keep it working for the
rest of the major, remove it in the next one.

**Status:** the gate is shipped and the policy above is decided. The tiering
mechanism is not needed for 2.0.0 — its absence is what makes the freeze
strict, and adding a tier later is additive where exporting first and deciding
later is not.

What holds the frozen surface in place meanwhile is not a report but the
runtime and type-level checks listed under
[C5](#c5-namespace-enumeration): the namespace member lists are asserted
exactly, so widening one is an edit made on purpose and read in review, which
is what a freeze needs. The exhaustive alternative was tried in #2476 and
rejected for tracking more than the contract.

---

## Delivery, in one paragraph

How an extension reaches the process is specified in #2400 and summarized here
only where it constrains the API. An extension **vendors or bundles whatever it
needs apart from what the host provides**, so installing one is downloading a
tarball and extracting it — there is nothing to resolve and no package manager
involved. Installs land under `<userData>/extensions/<sanitized-name>/<version>-<digest8>/`;
a *directory* install registers an extension in place and is the development
mode, which is why there is no packing step and no symlink. The renderer loads
from `freelens-extension://extensions/<sanitized-name>/<version>-<digest8>/<file>`
— one origin for all extensions, because an origin per extension would advertise
an isolation the host cannot guarantee under `contextIsolation: false`.

## The three dependency categories

The contract has three, not two:

- **host-provided** — must not be bundled ([C3](#c3-host-provided-singletons));
- **free** — bundle or vendor as you like ([C11](#c11-third-party-bundled-libraries));
- **forbidden** — native `.node` addons ([the ABI document](./v2-extension-abi.md)).

## Open items

| Item | Tracked in |
| --- | --- |
| Close the known re-export gaps | #2365 |
| Triage the `ae-forgotten-export` occurrences found while generating the enumeration was being tried | #2366 |
| `es-toolkit` undeclared; `child_process` spelled two ways | #2360 |
| Remove `pnpm` as an application dependency — the last step of the delivery mechanism | #2400 |
| Renderer sandboxing — the reason several isolation claims are *not* made here | #2399 |
| Fill the v1→v2 rename table while building out the fixture extension | #2451 |

## References

- [`docs/v2-extension-migration.md`](./v2-extension-migration.md) — the porting guide
- [`docs/v2-extension-abi.md`](./v2-extension-abi.md) — shipped binaries and process invocation
- [`docs/v2-plan.md`](./v2-plan.md) — decisions **D2** and **D5**
- [`docs/v2-styling.md`](./v2-styling.md) — the styling model in full
- [`docs/v2-routing-modernization.md`](./v2-routing-modernization.md) — what routing removed
