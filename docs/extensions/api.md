# Freelens extension API — contracts

This is the **normative** half of the extension specification of Freelens 2:
what the host guarantees, what surface an extension may rely on, and what
happens when a contract is violated. The developer-facing porting guide is
[`docs/extensions/migrating-from-v1.md`](./migrating-from-v1.md); the binary side
is [`docs/extensions/binaries.md`](./binaries.md).

**No compatibility is promised for v1 extensions.** The migration guide is what
they get instead.

## How to read this document

Each contract states three things:

- **Guarantee** — what the host promises.
- **Surface** — the stable names the guarantee is expressed in.
- **Failure mode** — what an author sees when the contract is violated. This is
  recorded because most of these fail at runtime rather than at build time, and
  several fail *silently*.

Anything not stated here is not part of the contract. Extensions run with full
privileges and can reach much more than this document describes; reaching it is
not supported, and it may change without notice.

---

## C1. Packaging and publication

**Guarantee.** `@freelensapp/extensions` is the **only** published package of
this repository. Every other `@freelensapp/*` package is private and must never
appear in an extension's dependencies.

**Surface.** One package, two files: `dist/extension-api.d.ts` (the rolled-up
declaration) and `dist/extension-api.js` (the runtime shim, with no
dependencies).

The bundled declaration is what makes the single-package model work rather
than merely assert it: `rolldown.dts.config.mjs` maps every workspace entry to
its emitted declaration and its `external` predicate returns false for them, so
every `@freelensapp/*` is inlined. Nothing else needs publishing.

**Failure mode.** A direct dependency on any other `@freelensapp/*` package
fails to install — the package does not exist on the registry.

**Consequence worth stating separately.** Because workspace packages are private
*and* inlined, **a symbol the API namespaces do not re-export is unreachable by
any means.** There is no package left to install and a type-only import fails at
module resolution with no `@types/` fallback. Re-export completeness is
therefore a correctness property, not a convenience. See [C5](#c5-namespace-enumeration).

---

## C2. The runtime-global API

**Guarantee.** The host assigns one object at startup, in each process:

```ts
// main      (freelens/src/main/index.ts)
globalThis.FreelensExtensionApi = { Common, Main, ...mainExtensionApiSingletons };
// renderer  (freelens/src/renderer/index.ts)
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

---

## C3. Host-provided singletons

**Guarantee.** The host publishes its singleton libraries on the **same** global
object. An extension declares them in `devDependencies` for compilation only,
marks them external, and lets its bundler rewrite the bare id to the global.

**Surface.** A closed list of module ids:

| Module id | Global | Published in |
| --- | --- | --- |
| `react` | `React` | renderer |
| `react-dom` | `ReactDom` | renderer |
| `react/jsx-runtime` | `ReactJsxRuntime` | renderer |
| `mobx` | `Mobx` | both |
| `mobx-react` | `MobxReact` | renderer |
| `monaco-editor` | `MonacoEditor` | renderer |

**Each process publishes the set it has**, which is why the third column exists.
Main has no window, so it publishes no DOM renderer and no code editor. What it
has is what an extension's main entry point can really share: `mobx`, where an
extension's stores and catalog entities live.

**A package belongs on this list if two instances of it misbehave.** React (hook
and reconciler identity), mobx (observable identity), monaco (global theme and
worker registration). Nothing else in the API's dependency set meets it.

**The names follow a mechanical rule:** strip the scope, split on `-`, `/` and
`.`, upper-case each segment, so `react-dom` is `ReactDom` and
`react/jsx-runtime` is `ReactJsxRuntime`. The host asserts at startup that every
key it publishes follows the rule, so a bundler plugin can derive each name from
the specifier instead of carrying a map.

These ids are **not** on the list, and an extension that still maps one of them
to the global gets `undefined` at runtime, not a build error:

- **`@freelensapp/extensions`** — the package is a thin shim that already reads
  the global, so bundling it is correct.
- **`react-router` and `react-router-dom`** — not dependencies of the host. An
  extension that wants them bundles its own ([C9](#c9-routing)).
- **`node-pty`** — v2 publishes no `Pty` global. An extension that needs to run a
  program uses `node:child_process` in its main entry point (see
  [`docs/extensions/binaries.md`](./binaries.md)).
- **`@ogre-tools/injectable` and `@ogre-tools/injectable-react`** — the host's
  dependency-injection library, which it keeps as an implementation detail (see
  [C7](#c7-the-dependency-injection-surface)). An extension that uses them
  bundles its own copy, at any version.

**The process entries export nothing to extensions.** Neither build of the host
assigns its entry's exports onto `globalThis`: the renderer is an app, and main
is an `es`-format library build whose `export` statements nothing imports,
because Electron runs it as the process entry point. A v1 extension that read
`global.React`, `global.Pty` or another export of a host entry finds nothing;
the singletons are reachable only through `FreelensExtensionApi`.

The maps live in `packages/core/src/extensions/api-globals/`, one per process,
each paired with the module id of every name it publishes. Membership cannot
drift between the two objects — the id map is typed `Record<keyof …, string>` —
and a name cannot drift from the rule: `assertExtensionApiSingletonNames` checks
every key against `globalNameForModuleId` at startup, and a unit test runs the
same assertion over both maps so a typo fails in CI without launching the app.

**Failure mode.** Bundling your own copy of a listed package. React throws
`invalid hook call`; **mobx fails silently** — two instances interoperate
through shared global state well enough that observables appear to work and
reactions simply do not fire where they should. A typo in a global name yields
`undefined`, not a build error. Code built against another major of a listed
package runs against the host's copy anyway: a mobx class compiled with legacy
(`experimentalDecorators`) decorators throws when its module is evaluated, so
the extension fails to load, and the annotations that do not throw are dropped
silently (see
[MobX 7 and mobx-react 10](./migrating-from-v1.md#mobx-7-and-mobx-react-10-standard-decorators-only)
for the messages).

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
- **Top-level await is allowed** in either entry point: the renderer imports the
  served URL and main imports a `file:` URL, both asynchronously.
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
[Node and Electron in the renderer](./migrating-from-v1.md#node-and-electron-in-the-renderer).

The declaration cannot enforce this: `extension-api.d.ts` is one file for every
process. The environment has to come from the extension's own compiler
configuration, and the migration guide specifies the layout that provides it,
under
[Source layout: one tsconfig per runtime environment](./migrating-from-v1.md#source-layout-one-tsconfig-per-runtime-environment):
`src/main/`, `src/renderer/` and `src/common/`, each with a `tsconfig.json` for
its environment, so a Node API in renderer code or a DOM API in main code fails
the type check rather than the running extension.

**Reloading.** A development install is reloaded when its entry points are
rebuilt: the host tears the extension down through `onDeactivate` and imports it
again under a fresh URL. That is why only an ESM `main` reloads. Node keys its
module map by URL, so the fresh URL is what makes a new module of the rebuilt
file — but a CommonJS module is cached below that by filename, which no URL
reaches, and the format Node resolved for a path is cached with it. So a path
once loaded as CommonJS is frozen as the module it was, for the life of the
process, however the file is rewritten; and a CommonJS build reached through
the ESM loader throws `ReferenceError: module is not defined in ES module
scope`. Neither cache can be evicted, so the host refuses those reloads instead
of attempting them.

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

---

## C5. Namespace enumeration

**Guarantee.** These are the members of each namespace. A symbol not listed here
is not reachable (see [C1](#c1-packaging-and-publication)).

| Namespace | Members |
| --- | --- |
| `Common` | `App`, `Catalog`, `Clusters`, `EventBus`, `LensExtension`, `Proxy`, `Store`, `Types`, `Util`, `logger`; types `InstalledExtension`, `LensExtensionManifest`, `Logger`, `PackageJson` |
| `Main` | `Catalog`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Power`, `Util` |
| `Renderer` | `Catalog`, `Component`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Theme`, `Util` |

There is no `Renderer.React`, no `Renderer.ReactDOM` and no
`Renderer.Registrations`. React reaches extensions through
[C3](#c3-host-provided-singletons), registrations through
[C6](#c6-registration-and-the-extension-instance).

The table is asserted, not generated, by three checks:

- `packages/core/src/extensions/__tests__/extension-api.test.ts` asserts the
  three member lists **exactly** — the table is that list — and then asserts
  only that each sub-namespace exists, is non-empty and still carries a handful
  of anchor symbols.
- `packages/core/src/extensions/__tests__/extension-api.types.ts` names those
  anchors and the types of this section's failure mode **as types**, so a
  symbol that stops being nameable stops `pnpm type:check` compiling.
- `packages/fixture-extension/src/common/contract-types.ts` does the same
  against the **built** declaration, which is the artifact an author resolves.

**Failure mode.** A missing re-export is a compile error with no workaround.
That is why `K8sApi` exports all of `@freelensapp/kube-object`, and why the
kube-api option and descriptor types that appear in exported signatures —
`KubeApiOptions`, `DerivedKubeApiOptions`, `KubeObjectStoreOptions`,
`KubeApiListOptions`, `KubeApiQueryParams`, `DeleteOptions`,
`PropagationPolicy`, `ResourceDescriptor`, `IKubeWatchEvent` — are exported
alongside `parseKubeApi` and `createKubeApiURL`, so they are nameable and not
merely callable.

### `K8sApi` exports all of `@freelensapp/kube-object`

The namespace exports **all** of `@freelensapp/kube-object`, including the shared
spec vocabulary — `Affinity`, `Capabilities`, `ContainerPort`, `Probe`,
`ResourceRequirements`, `SecurityContext`, `Toleration` — that an extension
adding resource views needs. Most of the package is interfaces, type aliases and
enums transcribing upstream Kubernetes API shapes, whose stability is inherited
from Kubernetes; its classes, functions and constants are what can change the
behaviour of the API.

**Two types share the name `KubeObjectStatus` in the source**: a Kubernetes
resource status shape (`{ conditions?: BaseKubeObjectCondition[] }`) and the
status registration type that extensions register status providers against.
The registration type keeps the name `KubeObjectStatus`. The resource status
shape is exported as **`BaseKubeObjectStatus`** — the base that
`DeploymentStatus`, `JobStatus` and the other resource statuses extend.

**The namespace reaches only what the package's own index exports.** `export *`
resolves through a package's index, so a module the index skips is invisible to
the namespace no matter what the namespace does. `SecurityContext`,
`PreemptionPolicy`, `JSONSchemaProps` and `ExternalDocumentation` appear in the
signatures of types the package exports (`Container.securityContext`,
`PriorityClass.preemptionPolicy`, the CRD schema), so its `src/types/index.ts`
exports the modules that declare them, and a type added to the package later
needs the same. `json-schema-props` carries documented `string` aliases
(`UUIDRegexString`, `UUID3RegexString`, `UUID4RegexString`,
`UUID5RegexString`, `CreditCardRegexString`) alongside `JSONSchemaProps`; they
are the `format` vocabulary for the CRD schema and are frozen with it under
[C14](#c14-versioning-and-compatibility).

### `Util` is `@freelensapp/utilities` minus the Node-bound members

`Common.Util` is delimited by a rule rather than by a list of what it offers:

- **Every export of `@freelensapp/utilities` is extension API**, and frozen with
  the rest under [C14](#c14-versioning-and-compatibility) — including an export
  added to the package later.
- **Except a member that needs Node or Electron in the renderer**, because
  renderer code gets no guarantee of either
  ([C4](#c4-module-format-and-loading)). Such a member goes on the omit list in
  `packages/core/src/extensions/common-api/utils.ts`, which destructures it out
  of the spread so that its name and types do not reach the bundled
  declarations either. Keeping them out also takes the pnpm patch of
  `rolldown-plugin-dts`: unpatched, the plugin keeps every member of
  `@freelensapp/utilities` in the bundle, because `utils.ts` reaches them
  through `import * as utilities`, and `build:dist` fails on their Node
  imports ([C11](#c11-third-party-bundled-libraries)).

`Main.Util` and `Renderer.Util` spread `Common.Util`, so an omitted member is
gone from all three; each adds its own `fetch` ([C12](#c12-http)).
`Common.Util.getAppVersion` is the one member the host defines itself.

**Whoever adds an export to the package** is therefore adding API, and checks
one thing: does it need Node or Electron to run in the renderer — a
`node:`/Electron import, a Node global such as `Buffer` or `process`, or a Node
type such as `NodeJS.ErrnoException` in its signature? If the dependency is
incidental to the implementation, remove it; if it is what the function does,
add the member to the omit list and a line to the migration guide.

**Failure mode.** A member that needs a Node global and is not on the list fails
at runtime in a renderer without Node — a `ReferenceError` for a global such as
`Buffer` — and not at compile time.

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

Two of these matter more than they look:

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

---

## C7. The dependency-injection surface

**Guarantee.** **The container and the DI library stay in the host.** The host
is built on `@ogre-tools/injectable`, but neither its container nor the library
is part of the extension API: no namespace exposes a container, an injection
token or a hook that registers an injectable, and the global publishes neither
`@ogre-tools/injectable` nor `@ogre-tools/injectable-react`
([C3](#c3-host-provided-singletons)). The host may change its DI library, or the
library's major, in any release.

**Surface.** None for authors. An extension contributes through the declarative
fields of [C6](#c6-registration-and-the-extension-instance), and the host's
registrators turn those fields into injectables in a view of the host's
container kept for that extension. An extension that wants dependency injection
for its own code bundles a DI library as an ordinary dependency — ogre-tools at
any version, or anything else — with its own container and, for
`withInjectables`, its own `DiContextProvider`. That container is the
extension's alone: it holds none of the host's injectables, and the host never
reads from it.

**The per-extension view is host-internal and no security boundary.** It is a
namespaced view, not an isolated container: the registrations made for an
extension get an id prefix and are torn down with the extension, and nothing
else about them is private. With `contextIsolation: false` an
extension reaches everything through `globalThis` anyway, so keeping the
container out of the API is a contract boundary, not a security one. What is
supported is what the namespaces expose; anything else may change without
notice.

**The lifecycle invariant:** *the view exists before the author's first hook and
is released after their last.* The loader injects it right after it constructs
the extension instance; the registrators populate it after activation, because
activation can register catalog categories they must see; and `disable()` runs
`onDeactivate` before `deregister()`.

**Failure mode.** An extension that still maps `@ogre-tools/*` to
`FreelensExtensionApi` gets `undefined` at runtime, not a build error. An
injectable created by an extension's own copy of ogre-tools means nothing to the
host's container, so there is nothing of the host's to pass it to.

---

## C8. React

**Guarantee.** Host-provided React **19**, reached through
[C3](#c3-host-provided-singletons). Extensions must not bundle their own.

**Surface.** `react`, `react-dom`, `react/jsx-runtime` as externals; `@types/react`
as a devDependency. React is not reached through a `Renderer.React` namespace,
which does not exist, and an extension does not declare React as a peer
dependency: the host provides it through the global, in development and in an
installed extension alike.

**Failure mode.** The invalid-hook-call trap: two copies of React in one renderer
break the Rules of Hooks, and any hook — including those inside host components
an extension renders — throws at runtime. It fails only at runtime, never at
build time.

---

## C9. Routing

**Guarantee.** Navigation runs on the in-house `@freelensapp/routing`. The API
re-exports no `react-router`, `react-router-dom` or `history`.

**Surface.** Pages are registered through `globalPages` / `clusterPages`
([C6](#c6-registration-and-the-extension-instance)) and navigated with
`navigateToRoute` and the route helpers. The **react-router 5 path dialect is
supported** — `/:param?` optionals and inline `/:param(regex)` patterns — by the
in-house `matchPath`, so existing path strings need no rewriting.

**Failure mode.** `import { Link } from "react-router-dom"` through the Freelens
bundle does not resolve. An extension that wants react-router JSX bundles its
own.

---

## C10. Styling and CSS

**Guarantee.** The host injects an extension's sibling stylesheet — either
`<entry>.css` or a `style.css` next to the renderer entry — as a `<link>` at the
URL main serves it from, the same route the renderer entry point takes. A
normal stylesheet import therefore works without the v1 `?inline` + `<style>`
workaround. At most one stylesheet is linked per renderer entry: `<entry>.css`
when it exists, `style.css` otherwise. Looking for a stylesheet the extension
does not ship leaves no error in the renderer console.

**Surface.** One CSS asset next to the renderer entry. The host's shared
component classes (`.Tooltip`, `.Button`, …) are global and part of the public
API and may be targeted; they must not be redefined. An extension's own styles
belong in CSS Modules.

**Failure mode.** A build that splits CSS per module emits assets the host does
not look for, and the extension renders unstyled. **The host's Tailwind does not
reach extensions** — its JIT scans only core's own sources, so an unprefixed
utility class produces no CSS and silently does nothing. An extension may run
its own Tailwind build; see the migration guide. The host carries no
`flexbox.scss`, so its utility classes do nothing either.

---

## C11. Third-party bundled libraries

**Guarantee.** `catalogs.extensions` in `pnpm-workspace.yaml` is the list of
libraries the published API's type surface is pinned against.

It splits in two:

- **Host-provided** ([C3](#c3-host-provided-singletons)): `react`, `mobx`,
  `mobx-react`, `monaco-editor`.
- **Free to bundle**: `chart.js`, `react-select`, `conf`, `es-toolkit`, `immer`,
  `rfc6902`, `type-fest` (plus the `@types/*` entries). A bundled `react-select`
  still gets the host's React, because that copy's own `import "react"` is
  rewritten too. `es-toolkit` is there only for the `DebouncedFunc` type the
  declaration imports from `es-toolkit/compat`.

**Surface.** The built declaration imports these external specifiers:
`type-fest`, `mobx`, `mobx-react`, `react`, `react/jsx-runtime`, `react-dom`,
`conf`, `rfc6902`, `immer`, `es-toolkit/compat`, `monaco-editor`, `chart.js`,
`react-select`.

This is the complement of the namespace enumeration in
[C5](#c5-namespace-enumeration): that records what the API *exports*, this what
it *imports* and therefore imposes on an author. It is read off the built
bundle, not the source tree:

```sh
pnpm --filter @freelensapp/extensions build:dist
rg -o '^import .* from "([^"]+)";$|import\("([^"]+)"\)' -r '$1$2' \
  packages/extensions/dist/extension-api.d.ts | sort -u
```

The pattern has two halves because the bundle names an external in two ways:
in an import statement, and in an `import("…")` type, which the bundler leaves
inline where it found it. The first half is anchored at the start of a line,
because the examples inside doc comments use the same double quotes. The bundle
inlines every `@freelensapp/*` package ([C1](#c1-packaging-and-publication)), so
everything the command prints is external by construction.

Nothing is imported from `electron`. What the declaration names of Electron it
names through the ambient `Electron` namespace, in the `Main.Ipc` signatures and
the `Common.Types` aliases of the main-process IPC events.

**Every package the declaration imports is declared**, in `dependencies` or
`peerDependencies`, either itself or through its `@types/` package: `react-dom`
resolves through `@types/react-dom`, and a subpath such as `es-toolkit/compat` or
`react/jsx-runtime` through its package. The requirement exists because an
undeclared import fails quietly: an extension compiles with `skipLibCheck`, so a
specifier that does not resolve in the author's tree becomes `any` instead of an
error, and nothing in the monorepo notices, since every such package happens to
be installed there. `packages/extensions/rolldown.dts.config.mjs` therefore
enforces it: `build:dist` fails and lists every external specifier of the
bundle whose package is not declared.

**Nothing of Node is imported or referenced**: no builtin, whether written
`node:fs` or `fs`, and no `/// <reference types="node" />`, which is how a
declaration names Node's global types. Renderer code gets no guarantee of Node
([C4](#c4-module-format-and-loading)), and an author's renderer config has no
Node types to resolve them against. The same config enforces it: `build:dist`
fails and lists every Node reference of the bundle. The likely cause of one is
the pnpm patch of `rolldown-plugin-dts` (`patchedDependencies` in
`pnpm-workspace.yaml`) no longer applying, which brings back the Node-bound
members `Common.Util` leaves out
([C5](#util-is-freelensapputilities-minus-the-node-bound-members)) with their
`node:` imports. `@types/node` is therefore not a dependency of the package: an
extension whose main code needs it declares it itself.

**How the package declares them.** The host-provided entries are in
`peerDependencies`, each **optional** in `peerDependenciesMeta` alongside
`electron`. Optional because npm 7+ and pnpm install missing peers by default,
so a required peer would install every one of them into every author's tree
whether imported or not — `monaco-editor` alone is large, and an extension with
only a `main` entry point would pay for it on every install and in every CI
cache. What keeps a second copy out of the bundle is the author marking the
specifier external, not the dependency field; the field only decides what gets
installed. The `@types/*` entries are in `dependencies`: a second copy of a
declaration is not a second instance of anything. `react-dom` itself is not
declared; the declaration needs only its types, which `@types/react-dom`
supplies. Nothing in-repo type-checks the published declaration without
`skipLibCheck`, the fixture extension included.

**Failure mode.** A host-provided library in `dependencies` of
`@freelensapp/extensions` **silently plants a real React in the author's tree**
for their bundler to find — which is precisely the mistake
[C3](#c3-host-provided-singletons) exists to prevent. As peers they are still
there to compile against, and bundling one's own copy becomes a deliberate act.

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

---

## C13. Consumer toolchain floors

**Guarantee.** The published declaration compiles in a consumer project that
meets these floors. **The floor is stated per surface area, not as one number
for the package**, because the two differ.

**Surface.**

| Requirement | Why |
| --- | --- |
| TypeScript 4.9 or newer | the declaration has `accessor` fields, which older compilers fail to parse whatever `skipLibCheck` says |
| `"skipLibCheck": true` | the type dependency graph is not clean under `false`, and checking it is not an author's job |
| `"lib"` including `DOM` and `DOM.Iterable`, `ES2024` or newer | the React component types name DOM types nothing else declares; the mobx types name `ReadonlySetLike`, which first appears in the ES2024 lib |
| `"moduleResolution": "bundler"`, `node16` or `nodenext` | to resolve the package's `exports` |
| `electron` as a devDependency | an **optional** peer — a hard dependency would download the Electron binary into every extension install |

The **fetch surface alone** needs `lib.dom` *or* `@types/node`: with structural
types it names only `AbortSignal`, `ReadableStream`, `URL` and `Uint8Array`,
which both declare. The package as a whole still requires `lib.dom`.

**Failure mode.** A compiler older than TypeScript 4.9 reports
`TS1434: Unexpected keyword or identifier` at every `accessor` field of the
declaration. Missing `skipLibCheck` produces errors in transitive type
dependencies an author cannot fix; a missing DOM lib produces unresolved-name
errors in the React component types.

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

**Failure mode.** `isCompatible: false` at discovery. **Every v1 extension is
refused on v2** until it declares `engines.freelens: ^2.0`, without a line of
its code running, which is why bumping `engines.freelens` is step one of the
migration guide and not a footnote.

"Not loaded" has several distinct causes and the UI distinguishes them, because
the remedy differs: incompatible (`isCompatible`), deliberately disabled
(`isEnabled`), or failed to load.

### Stability: everything exported is public

There is **no unstable tier**: every symbol the namespaces re-export is public
and stable **for the lifetime of the major**. Whatever a major release ships is
frozen until the next one, and a symbol exported by accident cannot be retracted
in a minor.

The namespace member lists are asserted exactly ([C5](#c5-namespace-enumeration)),
so widening one is an edit made on purpose and read in review.

Deprecation within a major: mark with `@deprecated`, keep it working for the
rest of the major, remove it in the next one.

---

## Delivery

An extension **vendors or bundles whatever it needs apart from what the host
provides**, so installing one is downloading a tarball and extracting it — there
is nothing to resolve and no package manager involved. Installs land under
`<userData>/extensions/<sanitized-name>/<version>-<digest8>/`; a *directory*
install registers an extension in place and is the development mode, which is
why there is no packing step and no symlink. The renderer loads from
`freelens-extension://extensions/<sanitized-name>/<version>-<digest8>/<file>`
— one origin for all extensions, because an origin per extension would advertise
an isolation the host cannot guarantee under `contextIsolation: false`.

## The three dependency categories

The contract has three, not two:

- **host-provided** — must not be bundled ([C3](#c3-host-provided-singletons));
- **free** — bundle or vendor as you like ([C11](#c11-third-party-bundled-libraries));
- **forbidden** — native `.node` addons ([the ABI document](./binaries.md)).

## References

- [`docs/extensions/migrating-from-v1.md`](./migrating-from-v1.md) — the porting guide
- [`docs/extensions/binaries.md`](./binaries.md) — shipped binaries and process invocation
- [freelens-example-extension](https://github.com/freelensapp/freelens-example-extension) —
  the reference template for building, type-checking, testing and releasing an
  extension, which this document leaves to the author
- [`docs/styling.md`](../styling.md) — the styling model in full
