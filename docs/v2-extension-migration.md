# Migrating extensions to Freelens v2

Freelens v2 breaks compatibility with the v1 extension API on purpose (see
[`docs/v2-plan.md`](./v2-plan.md), decisions D2/D5). This guide is for authors
of third-party extensions moving from v1 to v2.

It is the developer-facing half of the v2 extension specification. The
normative half — what the host guarantees, and what happens when a guarantee is
violated — is [`docs/v2-extension-api.md`](./v2-extension-api.md), with the
binary side in [`docs/v2-extension-abi.md`](./v2-extension-abi.md). Where this
guide says "the host does X", that document says why and what breaks otherwise.

The rename table below is filled while the in-repo fixture extension is built
out against the v2 contract ([#2451](https://github.com/freelensapp/freelens/issues/2451)),
which is what walks the whole v2 surface.

## Step one: bump `engines.freelens`

Before anything else:

```json
{ "engines": { "freelens": "^2.0.0" } }
```

**Until you do this, the host refuses your extension at discovery and the rest
of your work is invisible.** The gate is not advisory: `extensionApiVersion`
comes from the application version, so an extension declaring
`engines.freelens: "^1.6.2"` yields the range `>=1.6.0 <2.0.0-0`, which 2.0.0
does not satisfy. Every extension published for v1 is `isCompatible: false` on
v2 without a line of code being written.

## What changed, and why

- **ESM-first.** The application main process, renderer, and the extension API
  are all ES modules. A **main** entry may be authored as ESM or CommonJS —
  both are accepted, and both load from a real file path. A **renderer** entry
  is ESM, and the host loads it by URL from a privileged scheme rather than
  from disk.
- **No package manager is involved.** An extension vendors or bundles
  everything it needs apart from what the host provides, so installing one is
  downloading a tarball and extracting it. There are no dependencies to
  resolve, which is why the dependency rules below are rules rather than
  suggestions — nothing will hoist a missing package into place for you.
- **One published package.** `@freelensapp/extensions` is the only published
  package. Every other `@freelensapp/*` package is `private` and is consumed by
  the app as TypeScript source. Extensions must not depend on internal
  `@freelensapp/*` packages directly.
- **Runtime-global API.** The app assigns the API object to a global at startup
  in each process:

  ```ts
  // main process   (freelens/src/main/index.ts)
  globalThis.FreelensExtensionApi = { Common, Main, ...mainExtensionApiSingletons };
  // renderer       (freelens/src/renderer/index.ts)
  globalThis.FreelensExtensionApi = { Common, Renderer, ...rendererExtensionApiSingletons };
  ```

  The host-provided libraries ride on that same object, next to the
  namespaces — see below.

  `@freelensapp/extensions` is a thin shim that re-exports that global. At
  runtime the members resolve to the global whether your bundle inlines the
  shim or marks it external.

## Import changes

The import specifier is unchanged — you still import from
`@freelensapp/extensions`:

```ts
import { Common, Main, Renderer } from "@freelensapp/extensions";
```

What changed is what those names resolve to at runtime:

- In the **main** process, `Common` and `Main` are defined; `Renderer` is
  `undefined`.
- In the **renderer**, `Common` and `Renderer` are defined; `Main` is
  `undefined`.

Only touch the namespace for the process your code runs in — this matches v1
behaviour, where a `Main`-only extension entrypoint never reached renderer APIs.
The published types still expose the full surface (`Common` / `Main` /
`Renderer`) so authoring against all three in a single-package extension keeps
type-checking, even though the wrong-process namespace is `undefined` at
runtime.

## `package.json` for an extension

- Set `engines.freelens` to `^2.0.0` (see [Step one](#step-one-bump-enginesfreelens)).
- Depend on `@freelensapp/extensions` for **types**. You do not need to bundle
  it; the API is provided by the host through the runtime global.
- Author your main entry as ESM or CommonJS. If you ship ESM, set
  `"type": "module"` (or use `.mjs`). Your renderer entry must be ESM.
- Do not add any other `@freelensapp/*` package as a dependency — they are
  private in v2 and are not published.
- Add **`electron`** as a `devDependency` for its types. It is an *optional*
  peer of `@freelensapp/extensions`; a hard dependency would download the
  Electron binary into every extension install.

**Top-level await** is allowed by the contract in a renderer entry, but the
current loader is synchronous, so it does not work yet — it arrives with the
URL-served loader ([#2400](https://github.com/freelensapp/freelens/issues/2400)).
Do not rely on it in an extension you ship today.

### The host-provided libraries, and how to mark them external

Eight module ids must resolve to the host's instance rather than to a copy in
your bundle. You declare them in **`devDependencies`** — for compilation only —
and your bundler rewrites the bare id to a property of the host's global:

| Module id | Global |
| --- | --- |
| `react` | `FreelensExtensionApi.React` |
| `react-dom` | `FreelensExtensionApi.ReactDom` |
| `react/jsx-runtime` | `FreelensExtensionApi.ReactJsxRuntime` |
| `mobx` | `FreelensExtensionApi.Mobx` |
| `mobx-react` | `FreelensExtensionApi.MobxReact` |
| `monaco-editor` | `FreelensExtensionApi.MonacoEditor` |
| `@ogre-tools/injectable` | `FreelensExtensionApi.OgreToolsInjectable` |
| `@ogre-tools/injectable-react` | `FreelensExtensionApi.OgreToolsInjectableReact` |

The global names follow a mechanical rule — strip the scope, split on `-`, `/`
and `.`, upper-case each segment — so a bundler plugin can *derive* each name
instead of being handed a map. Note `ReactDom`, not `ReactDOM`.

**Each process publishes the set it has.** The renderer publishes all eight; the
main process publishes `Mobx` and `OgreToolsInjectable` and nothing else, because
a code editor and a DOM renderer have no place in a process with no window. Map
in your main entry point only what main publishes — the rest is `undefined`
there, and marking it external gets you no error, only a later surprise.

Everything else may be bundled freely: `chart.js`, `react-select`, `conf`,
`immer`, `rfc6902`, `type-fest`. A bundled `react-select` still gets the host's
React, because that copy's own `import "react"` is rewritten too.

Two ids that **leave** the v1 externals map, and both fail at runtime rather
than at build time if you keep them:

- **`@freelensapp/extensions`** — mapped in v1, when it was a fat re-export of
  core. The v2 package is 734 bytes that already read the global, so bundling
  it is correct.
- **`react-router-dom`** — removed from the host in #2261. Mapping it now
  yields `undefined`.

If your v1 build used a Vite or Rolldown plugin that rewrote these ids to
`global.React` and friends, keep the plugin and change the target: the host
publishes them on `globalThis.FreelensExtensionApi`, not as top-level globals.
The v1 top-level globals are gone. What put them there was webpack's
`libraryTarget: "global"`, which assigned each process entry's exports onto
`global`; electron-vite emits an app bundle for the renderer and an ESM library
bundle for main, and neither assigns anything to `globalThis`. Nothing is a
top-level global in v2, in either process.

## React version (host-provided, must match majors)

Freelens v2 ships **React 19**. React is **host-provided**: the running app
publishes a single React instance on `globalThis.FreelensExtensionApi`, and
extensions must render through that shared instance.

There is no `Renderer.React` and no `Renderer.ReactDOM`. Earlier drafts of this
guide said otherwise; they described API that never existed in v2. React reaches
you through the externals map in
[the section above](#the-host-provided-libraries-and-how-to-mark-them-external).

- **Do not bundle your own React.** Two copies of React in the same renderer
  break the [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning):
  any hook (including those inside host components you render) throws an
  "invalid hook call" at runtime. This fails only at runtime, not at build
  time, so it is easy to miss.
- Declare `react`, `react-dom` and `@types/react*` as **`devDependencies`** and
  mark them external. Not peer dependencies: a peer range would still install a
  real React into your tree for your bundler to find, which is the mistake this
  is trying to prevent. The `@freelensapp/extensions` types pin the React 19
  major, so authoring against them keeps type-checking honest.
- **This is a breaking change from the earlier React 18 preview.** Extensions
  built against React 18 types must move to React 19, because host-provided
  React and any React the extension bundles must share the same major (see the
  invalid-hook-call trap above). Extensions relying on host-provided React move
  with the host automatically once their peer range is `^19`; extensions that
  bundled their own React need a matching bump. React 19 removed long-deprecated
  APIs (for example `ReactDOM.render` / `findDOMNode` and legacy string refs),
  so audit for those while upgrading.

## `@ogre-tools/*` 23 (dependency-injection major)

Freelens v2 bumps the `@ogre-tools/*` dependency-injection packages
(`injectable`, `injectable-react`, …) from **17 to 23**. This is
extension-facing because the `@ogre-tools/*` types leak through the
`@freelensapp/*` packages and the extension API (injection tokens, `getInjectable`,
the React injection helpers). Re-check any code that constructs or consumes
injectables against the `@ogre-tools/*` 23 type surface after upgrading.

- **Namespaced runtime-registered ids.** `@ogre-tools/*` 23 namespaces the id of
  an injectable registered at runtime through a namespaced `di` (for example an
  extension-scoped registration) as `"<namespace>:<declaredId>"`. The host
  already strips this namespace where it surfaces ids for its own registries
  (see `packages/cluster-sidebar/src/sidebar-items.injectable.ts`), so
  extensions that only register injectables against the documented tokens need
  no change. If your extension does its **own** `injectManyWithMeta` and keys off
  `meta.id`, be aware the id may now carry a `"<namespace>:"` prefix — strip it
  (take the segment after the last `:`) if you compare against a bare declared id.

## `tsconfig.json` for an extension

The bundled `extension-api.d.ts` sets two floors for consumer compilers:

- `"skipLibCheck": true` — the type dependency graph (for example
  `@ogre-tools/injectable`, which references jest types) is not clean under
  `skipLibCheck: false`, and checking it is not your job.
- `"lib": ["ES2024", "DOM", "DOM.Iterable"]` (or newer) — mobx 6.15 types
  reference `ReadonlySetLike`, which first appears in the ES2024 lib.

`"moduleResolution": "bundler"` (or `node16`/`nodenext`) both resolve the
package's `exports`.

The API namespaces work in type positions exactly as in v1:

```ts
import { Common, Renderer } from "@freelensapp/extensions";

const manifest: Common.PackageJson = { name: "my-extension", version: "1.0.0" };

function renderIcon(props: Renderer.Component.IconProps) { /* ... */ }
```

## API namespace reorganization

Because compatibility is already broken, the API namespaces are reorganized
once, at this point (D5). If your v1 extension reached into a specific
namespace path, re-check it against the current type surface; a symbol may have
moved between `Common`, `Main`, and `Renderer`.

This is what each namespace provides in v2:

| Namespace | Members |
| --- | --- |
| `Common` | `App`, `Catalog`, `Clusters`, `EventBus`, `LensExtension`, `Proxy`, `Store`, `Types`, `Util`, `logger`; types `InstalledExtension`, `LensExtensionManifest`, `Logger`, `PackageJson` |
| `Main` | `Catalog`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Power`, `Util` |
| `Renderer` | `Catalog`, `Component`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Theme`, `Util` |

**If a symbol is not reachable through one of those, it is not reachable at
all.** Every other `@freelensapp/*` package is private and is inlined into the
bundled declaration, so there is nothing left for you to install and a type-only
import fails at module resolution with no `@types/` fallback. If you hit a
missing re-export, that is a bug in the API surface worth reporting rather than
something to work around.

### `@freelensapp/kube-object` imports move into `K8sApi`

In v1 an extension could add `@freelensapp/kube-object` to its dependencies and
import the Kubernetes spec types from it. In v2 that package is private, so
**the whole of it is re-exported from `K8sApi`** — in `Common`, `Main` and
`Renderer` alike. Drop the dependency and read the types off the namespace:

```diff
-import type { Condition, LabelSelector, LocalObjectReference } from "@freelensapp/kube-object";
+import { Renderer } from "@freelensapp/extensions";
+
+type Condition = Renderer.K8sApi.Condition;
+type LabelSelector = Renderer.K8sApi.LabelSelector;
+type LocalObjectReference = Renderer.K8sApi.LocalObjectReference;
```

Everything the package exports is there, not a curated subset: the concrete kube
objects, the shared spec vocabulary (`Affinity`, `Capabilities`, `ContainerPort`,
`Probe`, `ResourceRequirements`, `Toleration`, …), the `types/` directory, the
JSON-API guards. The same applies to the kube APIs: the option and descriptor
types that appear in their signatures — `KubeApiOptions`,
`DerivedKubeApiOptions`, `KubeObjectStoreOptions`, `KubeApiListOptions`,
`KubeApiQueryParams`, `DeleteOptions`, `PropagationPolicy`, `ResourceDescriptor`,
`IKubeWatchEvent` — are exported too, along with `parseKubeApi` and
`createKubeApiURL`. You no longer need
`ConstructorParameters<typeof Renderer.K8sApi.KubeApi>[0]` to name an options
type.

Two names to watch:

- **`KubeObjectStatus` is unchanged**: it is still the status-registration type
  you register providers against, `{ level, text, timestamp? }`. The Kubernetes
  status shape of the same name — `{ conditions?: BaseKubeObjectCondition[] }`,
  the base that `DeploymentStatus`, `JobStatus` and the rest extend — is exported
  as **`BaseKubeObjectStatus`**.
- **`Condition` and `ObjectReference` are now top-level names in `K8sApi`.** If
  you flatten the namespace anywhere — `const { Condition } = Renderer.K8sApi`,
  or a barrel that re-exports it alongside your own declarations — a local type
  of the same name now collides. This is type-only: it surfaces as a compile
  error in your extension, never as a runtime break, and renaming your own type
  or qualifying the namespace member fixes it.

The concrete v1→v2 rename table is filled while the in-repo fixture extension
is built out against this surface
([#2451](https://github.com/freelensapp/freelens/issues/2451)), and will be
appended here.

It is derived by comparing the **published v1 declaration** against the v2 one
above, rather than from porting a single extension. A port only covers the
symbols that one extension happened to use; a surface-to-surface comparison
covers all of them, and the fixture is what proves the v2 side is actually
reachable under real build conditions rather than merely present in a `.d.ts`.

## Registering things: declarative fields

Your extension contributes by **setting fields on your `LensExtension`
subclass**. The host reads them and translates each into its own registrations;
there is no registration API to call and no `Renderer.Registrations` namespace.

On `LensRendererExtension`: `globalPages`, `clusterPages`, `clusterPageMenus`,
`clusterFrameComponents`, `appPreferences`, `appPreferenceTabs`,
`entitySettings`, `statusBarItems`, `kubeObjectDetailItems`,
`kubeObjectMenuItems`, `kubeWorkloadsOverviewItems`, `commands`, `welcomeMenus`,
`catalogEntityDetailItems`, `topBarItems`, `additionalCategoryColumns`,
`customCategoryViews`, `kubeObjectHandlers`.

On `LensMainExtension`: `terminalShellEnvModifier`, which the host calls with
the environment of every terminal it opens. `appMenus` and `trayMenus` are gone
(see [Unused members removed](#unused-members-removed)).

On both: `protocolHandlers`, plus the `onActivate()` / `onDeactivate()` hooks.

A field you leave at its default contributes nothing, silently, so a
registration that never appears is usually a typo in a field name.

Two members are worth knowing before you need them:

- **`this.manifestPath`** is how you locate your own shipped files. In the
  renderer it is the only route — there is no `__dirname` under URL-based
  loading.
- **`await this.getExtensionFileFolder()`** gives you a writable directory of
  your own. It is keyed by `storeName` through a hash, so it survives reinstalls
  and version changes — unlike your install directory, which deliberately does
  not.

## HTTP: `Main.Util.fetch` and `Renderer.Util.fetch`

In v2 the host provides the HTTP client, one symbol per process:

| Symbol | Process | What answers the call |
| --- | --- | --- |
| `Main.Util.fetch` | main | the same client the app uses for its own binary and JSON downloads and its metrics requests |
| `Renderer.Util.fetch` | renderer | Chromium's `fetch`, reached through the host |

Both take the same arguments as the standard `fetch`, and both are additions to
`Common.Util` — `Main.Util` and `Renderer.Util` carry everything `Common.Util`
does, plus `fetch`.

**In main, prefer `Main.Util.fetch` over `globalThis.fetch`.** The global exists
there, but it knows nothing about the user's `httpsProxy` preference, their
`caCertificates` / `allowUntrustedCAs` settings, or the Freelens proxy. The
host-provided client honours all three, so an extension that uses it works in
the corporate-proxy and custom-CA setups where the global would simply fail —
without the extension having to implement any of it.

In the renderer, `Renderer.Util.fetch` is today Chromium's `fetch` and needs
none of that: requests to the cluster go to the frame's own origin, whose
certificate the window's session already trusts. It is nonetheless a symbol of
its own rather than a documented alias for the global. The renderer session
takes the *system* proxy while only main honours the `httpsProxy` preference;
if that asymmetry is ever fixed, extensions on the symbol get the fix and
extensions on the global do not.

There are deliberately **two** symbols and not one `Common.Util.fetch`. The
implementations differ, and one name would suggest an equivalence that does not
hold.

### The request and response types are structural

`FetchRequestInit` and `FetchResponse` — the types that reach you through
`K8sApi.KubeJsonApi` and `KubeApi.list()`'s `reqInit`, as well as through
`Util.fetch` — describe HTTP structurally rather than by naming a runtime's
classes:

```ts
interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: { get(name: string): string | null };
  readonly body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
```

This is what the two processes actually have in common. The renderer really
returns Chromium's `Response` and main really returns undici's — structurally
compatible classes, but distinct ones — so a contract that named either would
be describing one process and quietly misdescribing the other. It also means
`res instanceof Response` is not a reliable check in main; test `res.ok` or
`res.status` instead.

Two consequences for your code:

- **`await fetch(...)` is a `FetchResponse`, not a `Response`.** Passing it
  where a `FetchResponse` is expected is fine, and reading the members above is
  fine. Assigning it to a variable annotated `Response` is not, because
  `FetchResponse` is the wider type. `blob()`, `formData()`, `clone()`, `url`,
  `redirected` and `type` are not part of the contract; if you need one, reach
  for your own client for that call.
- **The fetch types add no `lib.dom` requirement.** They name only
  `AbortSignal`, `ReadableStream`, `URL` and `Uint8Array`, all of which
  `@types/node` declares as well. (The published surface as a whole still needs
  the DOM lib — its React component types do — see
  [`tsconfig.json` for an extension](#tsconfigjson-for-an-extension).)

Request bodies are `string | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>`.
`Blob`, `FormData` and `URLSearchParams` are not accepted; encode to a string
(`params.toString()`, `JSON.stringify(...)`) or a `Uint8Array` first.

### `dispatcher` is gone from `reqInit`

`FetchRequestInit` used to carry an undici `dispatcher`. It required an
extension to depend on `undici` in order to fill a slot it had no way to make
use of, so the slot is gone and `undici` is no longer among the type
dependencies `@freelensapp/extensions` declares. The capability it gestured at —
HTTP that respects the user's proxy and CA settings — is `Main.Util.fetch`.

## `K8sApi.forRemoteCluster` removed

`Main.K8sApi.forRemoteCluster` / `Renderer.K8sApi.forRemoteCluster` and the
`IRemoteKubeApiConfig` type are gone in v2 (#2374). The function built a
`KubeApi` pointing straight at an arbitrary API server URL, bypassing both the
catalog and the proxy, and configured TLS itself from `caData`,
`skipTLSVerify`, `clientCertificateData` / `clientKeyData` or a custom
`https.Agent`.

It was inherited from Lens, undocumented since it was introduced, and has no
known consumers — no in-tree callers, and no hits across the Freelens
extensions that could be surveyed. Once the host stops owning the TLS setup,
it also cannot be implemented honestly in the renderer: the renderer's `fetch`
is Chromium's and has no hook for a custom TLS configuration, so those options
would be silently ignored rather than applied.

`forCluster` is unaffected — it addresses a **catalog** cluster through the
proxy, which keeps handling authentication.

If your extension needs to reach a cluster that is not in the catalog, talk to
its API server directly — the `KubeApi` machinery does not buy you anything
there once it no longer owns the TLS setup.

From the main process, use [`Main.Util.fetch`](#http-mainutilfetch-and-rendererutilfetch)
rather than bundling an HTTP client: it already honours the user's `httpsProxy`
preference and their `caCertificates` / `allowUntrustedCAs` settings, which is
most of what a remote API server needs and all of what a corporate network
needs. Bundle your own client only for the part it genuinely cannot express —
per-request client certificates, or a CA that is trusted for this one call and
nothing else — and prefer doing that work in main, where a TLS configuration
can be applied at all.

## `Renderer.K8sApi` concrete store classes removed

The host's built-in store **classes** are no longer exported from
`Renderer.K8sApi` — `PodStore`, `DeploymentStore`, `CronJobStore`,
`CustomResourceDefinitionStore` and the rest, together with their v1 aliases
(`PodsStore`, `CRDStore`, `HPAStore`, …).

They were never designed as API. Most of them take a host dependency bag as the
first constructor argument — `CronJobStore`'s is
`KubeObjectStoreDependencies & { getJobsByOwner: GetJobsByOwner }` — which an
extension can neither build nor name, so the classes could not be instantiated
from outside the host in the first place. Exporting them anyway would freeze
those bags as public API under
[C14](./v2-extension-api.md#c14-versioning-and-compatibility), which means
refactoring an internal store dependency would formally become a breaking change
to the extension API. v2.0.0 is where that goes away.

**What stays, unchanged:**

- the store **singletons** — `podsStore`, `deploymentStore`, `cronJobStore`,
  `crdStore`, `eventStore`, `namespaceStore` and the rest of the list. These are
  the instances the host itself uses, they keep their full inferred type, and
  they are what the published extensions actually read;
- the generic base class `Renderer.K8sApi.KubeObjectStore<T>` (and
  `Main.K8sApi.KubeObjectStore<T>`), whose extension-facing constructor is
  `(api, opts)` — the host injects the dependencies for you;
- the static `getStore()` of `LensExtensionKubeObject`, called on your own
  class (`MyKind.getStore<MyKind>()`), and `apiManager.getStore()`, for
  reaching a store by its API.

So there are three replacements, depending on what you were doing:

```diff
-const pods: Renderer.K8sApi.PodStore = Renderer.K8sApi.podsStore;
+const pods = Renderer.K8sApi.podsStore;

-function summarize(store: Renderer.K8sApi.DeploymentStore) { … }
+function summarize(store: typeof Renderer.K8sApi.deploymentStore) { … }

-class MyStore extends Renderer.K8sApi.PodStore { … }
+class MyStore extends Renderer.K8sApi.KubeObjectStore<MyResource, MyApi> { … }
```

An instance keeps its full inferred type, so `typeof` is a complete replacement
for the class in a type position — it is the type of the host's store, not a
widened one.

Two of the removed classes have no exported singleton: `IngressClassStore` and
`CustomResourceStore` (alias `CRDResourceStore`). No API object for either is
exported, so reach their stores through `apiManager.getStore()` with the API
base path:

```ts
const ingressClasses = Renderer.K8sApi.apiManager.getStore(
  "/apis/networking.k8s.io/v1/ingressclasses",
);
```

For a custom resource, pass that resource's base path
(`/apis/<group>/<version>/<plural>`), or call the static `getStore()` on your
own `LensExtensionKubeObject` subclass.

If you were subclassing a built-in store, extend `KubeObjectStore` over your own
`KubeApi` instead, and register it with `apiManager`. If you find a case none of
the three replacements covers, open an issue: adding a symbol back to the API is
cheap, removing one is not, so this can return in a 2.x release.

### `NamespaceSelectBadgeNonInjected` is gone with them

`Renderer.Component` used to re-export the whole
`namespace-select-badge` module, which put the uninjected component
`NamespaceSelectBadgeNonInjected` and its `Dependencies` bag on the surface by
accident. Both are gone; `NamespaceSelectBadge` and `NamespaceSelectBadgeProps`
are exported explicitly and unchanged. Render the injected component — it
resolves the namespace filter from the host container itself:

```tsx
<Renderer.Component.NamespaceSelectBadge namespace={object.getNs()} />
```

## `Util` members that need Node removed

`Common.Util` carries every export of the host's utilities package except the
ones that need Node or Electron in the renderer, which v2 does not guarantee
there ([C5](./v2-extension-api.md#decided-util-is-freelensapputilities-minus-the-node-bound-members)).
These are gone from `Common.Util`, and with it from `Main.Util` and
`Renderer.Util`. No extension is known to use them; if you need one back in a
form that works without Node, ask for it.

- **`base64`** — use `TextEncoder` / `TextDecoder` with `btoa` / `atob`:
  `btoa(Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join(""))`
  to encode, and
  `new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)))`
  to decode, which throws on input that is not UTF-8 as `base64.decode` did.
- **`readFileFromTar`**, **`listTarEntries`** — read the archive in your main
  entry, with `tar` bundled or with Node directly, and hand the result to the
  renderer over `Main.Ipc` / `Renderer.Ipc`.
- **`unionPATHs`** — a `PATH` belongs to the processes main spawns; build it in
  main, splitting and joining on `path.delimiter`.
- **`isBuffer`** — there is no `Buffer` in the renderer to test for; test for
  `Uint8Array`, which `Buffer` extends.
- **`isErrnoException`**, **`isExecException`**, **`isExecFileException`**,
  **`isChildProcessError`**, **`isRequestError`** — these narrow errors thrown
  by Node's `fs`, `child_process` and `http`, which only main can call. Do that
  work in main, test the error there (`error instanceof Error && "code" in error`
  covers most uses), and send the renderer the outcome over `Ipc`.
- **`openExternal`**, **`openBrowser`** — in the renderer, call
  `window.open(url)` or render an `<a href={url} target="_blank">`. The host's
  window-open handler refuses every new window and hands an `http:` or `https:`
  URL to the system browser instead, which is what these did; any other scheme
  is dropped. In main, call Electron's `shell.openExternal(url)`.

## Unused members removed

These members are gone from v2. No extension is known to use them, and keeping
them meant publishing `react-window` or Electron's own types as part of the API,
the latter in `Common`, which renderer code reads too.

- **`Renderer.Component.VirtualList`** and its types — render a plain list, or
  bundle a virtualizer of your own (`react-window` included) if the list is long
  enough to need one.
- **`appMenus` and `trayMenus`** on `LensMainExtension`, with
  `Common.Types.MenuRegistration` and `Common.Types.TrayMenuRegistration` — no
  replacement. The application menu and the tray belong to the host.
- **`Common.Types.IpcRendererEvent`** — the event a `Renderer.Ipc` listener
  receives is typed `unknown`; leave that first parameter alone.
- **`Common.Types.IpcMainEvent`** and **`Common.Types.IpcMainInvokeEvent`** —
  `Main.Ipc.listen` and `Main.Ipc.handle` still type their handler's event, so
  an inline handler needs no annotation. Where you name the type yourself,
  import it from `electron` (`import type { IpcMainEvent } from "electron"`) in
  your main code.

## Node and Electron in the renderer

**Renderer code gets no Node and no Electron in v2**, `require()` included
([C4](./v2-extension-api.md#c4-module-format-and-loading)). They are still
reachable, because the renderer is not context-isolated yet, but nothing
guarantees them and they may disappear in any release. Everything that used to
lean on them in the renderer has a replacement already:

- the renderer entry point is ESM, loaded by URL, not `require()`d from disk;
- the host APIs and the shared libraries come from
  `globalThis.FreelensExtensionApi`, not from `require()`;
- your dependencies are bundled, and there is no `node_modules` next to a
  renderer entry point to resolve anything from;
- HTTP is Chromium's `fetch`, as
  [`Renderer.Util.fetch`](#http-mainutilfetch-and-rendererutilfetch);
- running programs belongs to main.

**The general rule: do Node work in your main entry point and talk to it over
`Main.Ipc` / `Renderer.Ipc`.** Main keeps Node and Electron, and a handler there
can return anything that survives structured cloning:

```ts
// main.ts
import { Main } from "@freelensapp/extensions";
import { X509Certificate } from "node:crypto";

class CertificateIpc extends Main.Ipc {}

export default class MyExtension extends Main.LensExtension {
  onActivate() {
    CertificateIpc.createInstance(this).handle("describe-certificate", (_event, pem: string) => {
      const certificate = new X509Certificate(pem);

      return { subject: certificate.subject, validTo: certificate.validTo };
    });
  }
}
```

```ts
// renderer.tsx
import { Renderer } from "@freelensapp/extensions";

class CertificateIpc extends Renderer.Ipc {}

export default class MyExtension extends Renderer.LensExtension {
  onActivate() {
    CertificateIpc.createInstance(this);
  }
}

export function describeCertificate(pem: string): Promise<{ subject: string; validTo: string }> {
  return CertificateIpc.getInstance().invoke("describe-certificate", pem);
}
```

What to use instead of each Node or Electron module v1 extensions called from
the renderer:

| v1 | Replacement |
| --- | --- |
| `node:crypto` hashing | Web Crypto `crypto.subtle.digest` (asynchronous), or a bundled hash library |
| `crypto.X509Certificate` | main plus `Ipc`; there is no web equivalent |
| `http` / `https` | `fetch` |
| `electron` `ipcRenderer` | `Renderer.Ipc` |
| `os` platform checks | `Common.App.isMac` / `isWindows` / `isLinux` |
| `process.env` | read it in main and pass it over `Ipc` |
| `Buffer` | `Uint8Array`, `TextEncoder` / `TextDecoder` |
| `AsyncLocalStorage` | no browser equivalent; pass the context explicitly |

`Renderer.Ipc.listen` still calls your listener with an event object before the
broadcast's arguments, but that first parameter is typed `unknown` now: only
the arguments after it are guaranteed, so a `(_event, ...args) => …` listener
keeps compiling and one that reads `event.sender` stops. `Main.Ipc` is
unchanged, since main has Electron.

A hash in the renderer, for example, becomes:

```ts
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
```

**In the renderer build, do not mark the Node builtins external.** A v1 bundle
left them as `require("crypto")` calls and Node resolved them at runtime. A v2
renderer bundle is ESM, so an external builtin stays in it as
`import "crypto"`, and a bare specifier like that does not resolve from a
`freelens-extension://` URL: the entry point fails to load, and the extension
with it. Build the renderer entry for the browser and treat every builtin the
bundler still finds as an import to replace from the table above. The **main**
build keeps the builtins external, as before.

Reaching for `globalThis.require` instead works for now, and is exactly the
dependency that isolating the renderer will break. The host logs a deprecation
warning the first time your renderer code calls it for each module id, naming
your extension and the module, and still returns the module:

```text
[EXTENSIONS]: extension "my-extension" called require("crypto") in the
renderer. Renderer code gets no guarantee of Node or Electron, and require()
may disappear in any release; see "Node and Electron in the renderer" in the
extension migration guide.
```

## Routing: `react-router` re-exports removed

Freelens v2 dropped `react-router` 5, `react-router-dom` 5, and `history` v4
from the host (Phase 2 routing modernization, #2261 — `react-router` 5 is
unmaintained and blocked the React 19 upgrade). Navigation now runs on the
in-house pieces in `@freelensapp/routing`. **This is an intended, extension-
facing breaking change:** the `Common.ReactRouter` / `Renderer.ReactRouterDom`
bundle re-exports no longer exist, so `import { Link } from "react-router-dom"`
via the Freelens bundle will fail to resolve at runtime.

If your extension used them, migrate one of two ways:

- **Preferred — use the internal navigation API.** Register pages with
  the declarative `globalPages` / `clusterPages` fields on your
  `LensRendererExtension` subclass — there is no `Renderer.Registrations` — and
  navigate with the injectable `navigateToRoute` / route helpers instead of react-router
  `Link` / `Redirect` / `Route`. Route schemas keep the same
  `react-router` v5 dialect (`/:param?` optionals, inline `/:param(regex)`
  patterns), matched by the in-house `matchPath`, so existing path strings are
  unchanged.
- **Or bundle your own `react-router`.** If you must keep react-router JSX, add
  `react-router` / `react-router-dom` to your extension's own dependencies and
  bundle them; do not rely on the host providing them.

See [`docs/v2-routing-modernization.md`](./v2-routing-modernization.md) (§2.5
and §5) for the rationale and the full list of what was removed.

## `Renderer.Component.List` removed

`Renderer.Component.List`, along with its `ListProps` and `SearchFilter` types,
is gone in v2 (#2360). It was a thin search box plus a `react-table` 7 table,
and its props extended `react-table`'s own `UseTableOptions`, so the package
was part of the published type surface: the column objects an extension passed
in (`Header`, `accessor`, `sortType`, `disableSortBy`, `width`) were
`react-table` column objects.

`react-table` 7.8.0 was last released in 2022-05, the repository moved on to
TanStack, and its peer range stops at React 18 — Freelens v2 runs React 19. It
had exactly one consumer in the host (the installed-extensions screen), which
now uses an internal table, so keeping the dependency alive only to keep this
one re-export would have frozen an unmaintained package into the v2 extension
API.

If your extension used `List`:

- **Render your own table.** For four columns and client-side sorting this is
  a `<table>`, a `useState` for the sort column, and an `Array.prototype.sort`
  — the host's replacement is about a hundred lines including the stylesheet.
- **Or bundle your own table library.** Add `react-table`,
  `@tanstack/react-table`, or whatever you prefer to your extension's own
  dependencies; the host no longer provides one.

`Renderer.Component.Table` (with `TableHead`, `TableRow`, `TableCell`) is
unaffected and stays. It is the virtualized table the resource views use, it
persists its sort order in the URL, and it expects items with a `getId()` /
`getName()` shape — a different tool than `List` was, but the right one if your
rows are Kubernetes objects.

## Chart.js v4 (`Renderer.Component.BarChart` / `PieChart`)

Freelens bundles Chart.js **v4** (previously v2.9). The `BarChart` and
`PieChart` components re-exported from `Renderer.Component` are thin wrappers
around Chart.js, so their `options` prop is a Chart.js **v4** `ChartOptions`
object. If your extension passes a chart `options` object shaped for the old
v2 API, it must be migrated. The most common changes:

- Scales are keyed objects, not arrays: `scales.xAxes: [{…}]` /
  `scales.yAxes: [{…}]` become `scales.x: {…}` / `scales.y: {…}`.
- Grid/tick styling moved: `gridLines` becomes `grid` (with the axis line
  under `border`), `ticks.fontColor` / `ticks.fontSize` become `ticks.color`
  / `ticks.font.size`.
- Tooltips moved under plugins: `options.tooltips` becomes
  `options.plugins.tooltip`, and the callback signatures now receive a single
  `TooltipItem` context (read `context.parsed.y`, `context.dataset.label`,
  `context.dataIndex`) instead of `(item, data)`.
- Doughnut/pie `cutoutPercentage: 63` becomes `cutout: "63%"`.
- Custom plugins must implement the v4 `Plugin` interface (a required `id`
  and `(chart, args, options)` hook signatures).

See the Chart.js [v3](https://www.chartjs.org/docs/latest/migration/v3-migration.html)
and [v4](https://www.chartjs.org/docs/latest/migration/v4-migration.html)
migration guides for the full list.

## Styling and CSS

In v1 the extension bundler ran a `style-loader`, which injected each imported
stylesheet into the document at runtime. In v2 extensions are built by their
authors in Vite **library mode**, which does the opposite: it *extracts* CSS to
a sibling asset next to the JS entry and injects nothing. The host loads an
extension by `require()`-ing its JS entry, so without help that extracted CSS
would never reach the page — which is why early v2 extensions had to import
each stylesheet twice and inline it through a manual `<style>` tag:

```tsx
// The workaround you no longer need:
import styles from "./available-version.module.scss"; // mangled class names
import stylesInline from "./available-version.module.scss?inline"; // raw CSS text
// ...
<style>{stylesInline}</style>;
```

**The host now injects the extension's stylesheet for you.** When the renderer
loads an extension, the extension loader looks next to the renderer entry for a
sibling stylesheet — either `<entry-name>.css` (e.g. `renderer.js` →
`renderer.css`) or a `style.css` in the same folder — and, if present, links it
into the document with a `<link>` at the URL it serves that file from. So you can
import your SCSS the normal way and drop the `?inline` copy and the `<style>`
tag:

```tsx
import styles from "./available-version.module.scss"; // class names only
// no ?inline import, no <style> tag — the host loads the emitted CSS
```

To rely on this, make your Vite library build emit **one** CSS asset next to
the renderer entry:

- Keep Vite's default single-file CSS extraction (it emits `style.css`), or
  name it after the entry. Either is picked up automatically.
- If your build splits CSS per module (for example with
  `output.preserveModules: true`), consolidate it into a single asset, or add a
  runtime CSS-injection plugin such as `vite-plugin-css-injected-by-js` (which
  embeds the CSS into the JS bundle and injects it itself — also fine, since
  extensions run in the host window).

Use **CSS Modules** (`*.module.scss`) to scope an extension's own component
styles; the class names are mangled at build time so they never collide with
the host or with other extensions. For the host's shared component classes
(`.Tooltip`, `.Button`, …), which are global and part of the public API, you
may target them directly — do not redefine them. See
[`docs/v2-styling.md`](./v2-styling.md) for the full styling model.

> Note: the **host's** Tailwind does not reach extensions — its JIT only scans
> core's own source, so a Tailwind class you write expecting the host to have
> emitted it produces no CSS. You are not limited to SCSS/CSS, though: an
> extension can **bring its own Tailwind** by running Tailwind in its own build
> and shipping the generated utilities in its stylesheet. See
> [Bringing your own Tailwind](#bringing-your-own-tailwind).

## Migrating off flexbox.scss

Older extensions relied on the host's in-house **flexbox utility classes**
(`flex`, `column`, `gaps`, `box`, `grow`, `align-center`, …), which the host
used to load globally. **The host no longer ships `flexbox.scss`**, so these
class names now do nothing — an element with `className="flex column"` will no
longer stack vertically, `box grow` will not grow, and so on. This is a
breaking change; extensions must provide the equivalent layout in their own
CSS.

Migrate to **plain CSS** in your own stylesheet: give the element a class and
add the equivalent declarations. Do not depend on any host-generated Tailwind
class — it is emitted only if core happens to use it. (If your extension has
substantial UI and you would rather write utilities inline, you can instead
run your own Tailwind build — see
[Bringing your own Tailwind](#bringing-your-own-tailwind) — but for a handful of
flex rules plain CSS is the lighter option.)

Legacy class → the CSS to add to your own rule:

| Legacy class(es) | CSS to add |
|---|---|
| `flex` | `display: flex` |
| `flex inline` | `display: inline-flex` |
| `flex column` / `column reverse` | `display: flex; flex-direction: column` / `column-reverse` |
| `flex reverse` | `display: flex; flex-direction: row-reverse` |
| `flex wrap` / `wrap-reverse` | `display: flex; flex-wrap: wrap` / `wrap-reverse` |
| `flex fullsize` | `width: 100vw; height: 100vh` |
| `flex auto` | `> * { flex: 1 1 0%; }` |
| `flex center` | `> * { margin: auto; }` |
| `justify-flex-start` / `-end` / `justify-space-between` / `-around` / `justify-center` | `justify-content: flex-start` / `flex-end` / `space-between` / `space-around` / `center` |
| `align-center` / `align-flex-start` / `-end` / `align-stretch` / `align-baseline` | `align-items: center` / `flex-start` / `flex-end` / `stretch` / `baseline` |
| `content-*` | `align-content: *` (same value names as `align-*`) |
| `gaps` | `gap: 8px` — the host default was `8px` (`--flex-gap`); set the value you actually need. Modern `gap` replaces the old per-child margins |
| `box grow` | `flex: 1 0` |
| `box grow-fixed` | `flex: 1 0 0` |
| `box center` | `margin: auto` |
| `box left` / `box right` | `margin-right: auto` / `margin-left: auto` |
| `box self-flex-start` / `-end` / `self-stretch` / … | `align-self: flex-start` / `flex-end` / `stretch` / … |
| bare `box` | delete it (it was only a marker for the `box *` child utilities) |

Example — a health-checks list that used to stack vertically:

```tsx
// Before (relied on the host's flexbox.scss):
<div className="KustomizationHealthChecks flex column">…</div>

// After (own CSS):
<div className={styles.healthChecks}>…</div>
```

```scss
/* your-component.module.scss */
.healthChecks {
  display: flex;
  flex-direction: column;
}
```

## Bringing your own Tailwind

The host cannot hand its Tailwind to extensions: `packages/core/tailwind.config.js`
sets `content: ["src/**/*.tsx"]` and the host CSS is generated at **host build
time**, while extensions are installed at **runtime** — the host JIT can never
see an extension's class usage, so a class only "works" if core happens to emit
it (the trap [`docs/v2-styling.md`](./v2-styling.md) warns about). But nothing
stops an extension from running **its own** Tailwind v4 build and shipping the
generated utilities in the single CSS asset the host already injects (the loader
appends your sibling `style.css`/`<entry>.css` — see
[Styling and CSS](#styling-and-css)). With three adjustments this composes with
the host's styling model and needs **no host-side changes**.

1. Add `tailwindcss` and `@tailwindcss/vite` as devDependencies and the plugin
   to your Vite config. Keep the single-CSS-asset output the styling section
   above already requires.

2. In your stylesheet entry, import Tailwind **granularly** — theme and
   utilities only, with a per-extension `prefix()`, and **never preflight**:

   ```css
   @layer theme, utilities;
   @import "tailwindcss/theme.css" layer(theme) prefix(myext);
   @import "tailwindcss/utilities.css" layer(utilities) prefix(myext);
   ```

   - **No preflight** (`tailwindcss/preflight.css`): the linked stylesheet
     applies to the whole host document, so preflight would re-reset the entire
     app.
   - **Prefix**: utilities become `myext:flex`, `myext:gap-2`, and the theme
     variables are namespaced too. This keeps two builds (host + extension) from
     emitting the same class name with diverging definitions, and makes it
     impossible to accidentally lean on a host-generated class.
   - **Layers compose**: the host declares the layer order first in `app.scss`,
     so your `@layer utilities` rules merge into the same document layer.
     Unlayered component CSS (including your own CSS Modules) still beats
     utilities, exactly as in core.

3. Bridge the host theme tokens instead of hardcoding colors, mirroring what
   core does in `tailwind.config.js`. `@theme inline` makes the utility emit the
   `var()` reference rather than a build-time value, so it re-themes at runtime:

   ```css
   @theme inline {
     --color-text-primary: var(--textColorPrimary);
     --color-text-accent: var(--textColorAccent);
   }
   ```

   The `var(--…)` custom properties are set on `:root` by the host theme system,
   so `myext:text-text-primary` re-themes automatically.

4. If you need a dark variant, wire it to the real theme mechanism the way
   `app.scss` does — there is no `.dark` class; the host toggles
   `body.theme-light`:

   ```css
   @custom-variant dark (&:where(body:not(.theme-light), body:not(.theme-light) *));
   ```

   Prefer `var(--…)` tokens over `dark:` regardless — they re-theme on their own.

Rules that follow: never use an **unprefixed** Tailwind class expecting the host
to have emitted it; keep utilities in the disposable-layout role (component
styling stays CSS Modules, host public classes stay plain-CSS targets); and for
just a few flex rules, the [plain-CSS mapping](#migrating-off-flexboxscss) above
is still lighter than wiring up a Tailwind build.

## The development loop

In v2 you point Freelens at your package directory and work. **Installing a
directory registers the extension in place**, so there is no packing step, no
symlink, no junction and no `install:dev` script — and none of the Windows
Developer Mode friction that symlinks used to require.

**Rebuilding reloads the extension.** The host watches the entry points your
manifest names — `main` and `renderer`, at their real paths — and when your
bundler rewrites one, it tears the extension down and imports it again in both
processes. There is nothing to press: run your bundler in watch mode and work.

What a reload is, so that what you have to write is clear:

- It is a **full teardown, not a swap**. Your `onDeactivate` runs, your
  disposers run, everything you registered is taken back out, and only then is
  the new build imported and `onActivate` called again. Anything your extension
  leaves behind — a listener on a host object, a timer, an element appended to
  the document — has to be released in `onDeactivate` or in the extension's
  disposers, or it survives the reload and accumulates.
- One rebuild is **one reload**, however many entry points it writes, and the
  host waits for a half-written bundle to settle before importing it.
- Your **stylesheet is re-linked** and the previous one is removed, so your CSS
  does not stack up across reloads.

Three consequences to know:

- An extension installed this way is **unverified by construction** and is
  marked as such in the UI. The absence of a version-and-digest segment in its
  path is what identifies it; there is no separate flag.
- **Each reload retains the previous module graph.** A module object cannot be
  evicted from a realm's module map, so memory grows with the reload count.
  Deinitialisation still happens properly through `onDeactivate`, but a long
  editing session is a reason to restart the app, not a leak to report.
- **Reloading a `main` entry point needs ESM.** The host imports it under a
  fresh URL each time, which is what makes it a new module — but a CommonJS
  entry point is cached below that by filename, which no URL reaches, and the
  format Node resolved for that path is cached with it. So a `main` once loaded
  as CommonJS is frozen as the module it was for the life of the process, and
  rewriting the file as ESM does not release it either. Ship ESM from `main` if
  you want the development loop; the renderer is ESM by contract and is
  unaffected.

  A rebuild the host cannot reload is **refused, not attempted**: your
  extension goes on running the build it already has, in both processes, and
  main logs which of the two cases it is —

  ```text
  [EXTENSIONS-LOADER]: not reloading "my-extension" after a rebuild: its
  "dist/main.js" entry point was loaded as CommonJS, which Node caches by
  filename for the life of the process, so the running build would stay.
  Restart the application to run it.
  ```

  This costs you the renderer's reload as well: main refuses before it tells
  the renderer anything, deliberately, so that the two processes stay on the
  same build — which means a CommonJS `main` leaves a rebuild of *only* the
  renderer entry point unreloaded too, and the development loop does not work
  at all until `main` is ESM.

  The other case is having *started* as ESM and rebuilt as CommonJS, which
  would throw `ReferenceError: module is not defined in ES module scope` from
  inside your bundle — an error naming neither your extension nor the real
  cause. Either way the fix is the same: make `main` ESM (`.mjs`, or `.js` with
  `"type": "module"` in your `package.json`) and restart once. What the host
  goes by is the entry point's file extension, and otherwise your manifest's
  `type` — and, for what is *running*, the format it was actually loaded as,
  which is why changing `type` alone still needs the restart.

Only the files your manifest names are watched, so a rebuild which changes the
manifest itself — a renamed entry point, a new one — needs the application
restarted once.

## Checklist

- [ ] Replace any direct `@freelensapp/*` internal dependency with
      `@freelensapp/extensions` (types only).
- [ ] Import stylesheets normally (side-effect or CSS-module import); drop any
      `?inline` + `<style>` CSS workaround, and make sure your build emits a
      single CSS asset next to the renderer entry.
- [ ] Replace any legacy `flexbox.scss` classes (`flex`, `column`, `gaps`,
      `box`, `grow`, `align-center`, …) with plain CSS in your own stylesheet —
      the host no longer provides them (see
      [Migrating off flexbox.scss](#migrating-off-flexboxscss)). For substantial
      UI you can instead run your own Tailwind build (see
      [Bringing your own Tailwind](#bringing-your-own-tailwind)).
- [ ] Confirm your entrypoints are ESM or CommonJS and, if ESM, that
      `package.json` declares it.
- [ ] Access only the process-appropriate namespace (`Main` in main,
      `Renderer` in the renderer, `Common` in both).
- [ ] Re-check any moved API symbols against the published type surface.
- [ ] Replace any `K8sApi.forRemoteCluster` usage with a direct call to the API
      server — it was removed (see
      [`K8sApi.forRemoteCluster` removed](#k8sapiforremotecluster-removed)).
- [ ] Replace any bundled HTTP client, and any `globalThis.fetch` in main, with
      `Main.Util.fetch` / `Renderer.Util.fetch` — the host's client is the one
      that honours the user's proxy and CA settings (see
      [HTTP: `Main.Util.fetch` and `Renderer.Util.fetch`](#http-mainutilfetch-and-rendererutilfetch)).
- [ ] Drop any `undici` dependency added for the `dispatcher` field of
      `reqInit` — the field is gone and `undici` is no longer a declared type
      dependency of `@freelensapp/extensions`.
- [ ] Re-check anything annotated `Response` or `RequestInit` from the DOM: the
      shared fetch types are structural now, so `const r: Response = await
      fetch(...)` no longer compiles.
- [ ] Replace any `react-router` / `react-router-dom` usage imported via the
      Freelens bundle — the `ReactRouter*` re-exports were removed (see
      [Routing: `react-router` re-exports removed](#routing-react-router-re-exports-removed)).
- [ ] Replace any `Renderer.Component.List` usage with your own table — it was
      removed along with the `react-table` dependency behind it (see
      [`Renderer.Component.List` removed](#renderercomponentlist-removed)).
- [ ] Replace any built-in store **class** named from `Renderer.K8sApi`
      (`PodStore`, `CRDStore`, `HPAStore`, …) with the store singleton, with
      `typeof` that singleton in type positions, or with
      `KubeObjectStore<T>` as the base class for your own store (see
      [`Renderer.K8sApi` concrete store classes removed](#rendererk8sapi-concrete-store-classes-removed)).
- [ ] Replace any use of `Renderer.Component.VirtualList`, `appMenus`,
      `trayMenus`, `Common.Types.IpcRendererEvent`,
      `Common.Types.IpcMainEvent` or `Common.Types.IpcMainInvokeEvent` — they
      were removed (see
      [Unused members removed](#unused-members-removed)).
- [ ] Move any Node or Electron use out of the renderer — `require()`, a
      builtin import, `Buffer`, `process` — to the replacements in
      [Node and Electron in the renderer](#node-and-electron-in-the-renderer),
      or into main behind `Ipc`, and stop marking the builtins external in the
      renderer build.
- [ ] Load your extension in a v2 build and verify its UI renders through the
      runtime global.

And the two that fail silently rather than loudly, so they need an explicit
check rather than a smoke test:

- [ ] **Bump `engines.freelens` to `^2.0.0` first** — without it the host
      refuses the extension at discovery and nothing else you changed is
      observable.
- [ ] Verify you are on the **host's** React and mobx instances, not copies. A
      second React throws `invalid hook call` when a hook runs; a second mobx
      throws nothing at all — its reactions simply do not fire. Assert on an
      observable the host reacts to rather than eyeballing the UI.

## Still pending

Noted here so the guide is honest about what an author cannot do yet, even
having done everything above.

| Pending | Effect on you | Tracked in |
| --- | --- | --- |
| No author-facing hook for registering an injectable | the container view now exists before `onActivate`, but nothing hands it to you | [#2450](https://github.com/freelensapp/freelens/issues/2450) |
| Known missing re-exports | some types are callable but not nameable | [#2365](https://github.com/freelensapp/freelens/issues/2365) |
| The fixture extension is not yet built out against the full v2 surface | the namespace rename table above is not filled | [#2451](https://github.com/freelensapp/freelens/issues/2451) |

The rolled-up, self-contained `.d.ts` for the published
`@freelensapp/extensions` (no `@freelensapp/*` imports, declared type
dependencies, namespaces usable in type positions) is done and verified
against a strict-mode scratch consumer.

If your extension ships executables alongside its JavaScript, read
[`docs/v2-extension-abi.md`](./v2-extension-abi.md) — the short version is that
2.0.0 extracts them and never uses them.
