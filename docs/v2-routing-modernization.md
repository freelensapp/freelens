# Freelens v2 Routing Modernization (Phase 2 scoping)

Status: scoping. Tracking issue
[#2261](https://github.com/freelensapp/freelens/issues/2261); part of the
React upgrade plan [#2154](https://github.com/freelensapp/freelens/issues/2154).

This document is the deliverable of the first Phase 2 task: **scope the
internal route registry** to decide between the two modernization approaches:

- **(a)** migrate to `react-router` 6/7, or
- **(b)** drop `react-router` entirely in favor of the internal injectable
  route registry.

Every claim below was verified against the current tree; file references are
included so the follow-up PRs can act on them directly.

## 1. Why this phase exists

`react-router` 5 + `mobx-observable-history` are the one subsystem that cannot
follow the rest of the workspace to React 19:

- `react-router` 5.3.4 is unmaintained.
- `mobx-observable-history` 2.0.3 is abandoned upstream and was written against
  the `history` v4 API.

Phase 2 removes that blocker. It is independent of the React version and can
proceed on React 18; it is the real gate for Phase 3 (React 19).

## 2. Verified current state

### 2.1 `history` is already v5

Contrary to the initial plan wording, the workspace already runs `history`
`^5.3.0` everywhere (`packages/core`, `packages/extensions`,
`packages/routing`). Both `react-router` 5 and `mobx-observable-history` still
speak the `history` v4 runtime surface, so a small compatibility proxy bridges
them:

- `packages/routing/src/history-compat.ts` — `toHistoryV4()` adapts a v5
  history instance back to the v4 runtime surface (`goBack`/`goForward`,
  two-argument `listen`, `length`).
- `packages/routing/src/history.injectable.ts` — wraps
  `createBrowserHistory()` in `toHistoryV4`.
- `packages/routing/src/observable-history.injectable.ts` — feeds that adapted
  history into `createObservableHistory` from `mobx-observable-history`.

**Consequence:** the "remove `history` v4" task from the issue is already
done at the dependency level. What remains under that heading is deleting the
`toHistoryV4` shim once its two consumers (RR5 and `mobx-observable-history`)
are gone.

> **Resolved (step 5).** Both consumers are gone. `toHistoryV4` /
> `history-compat.ts` were deleted; the wrapper's `goBack`/`goForward`/`length`/
> two-argument `listen` are now implemented directly on `ObservableHistory` over
> native `history` v5, and `history.injectable.ts` returns a plain
> `createBrowserHistory()`. See §5.5.

### 2.2 No `react-router` hooks are used

There are **zero** usages of `useHistory`, `useParams`, `useLocation`, or
`useRouteMatch` across the workspace (excluding tests). Navigation state is
read exclusively through the internal mobx abstractions
(`observableHistoryInjectionToken`, `currentPathInjectable`, page params). This
removes the single largest source of churn a react-router 6/7 migration usually
incurs.

### 2.3 The internal registry already owns matching and rendering

The main cluster-view routing does **not** go through `<Route>`/`<Switch>`. It
is driven by the internal injectable registry:

- `packages/core/src/common/front-end-routing/front-end-route-injection-token.ts`
  defines the internal `Route` type (`path`, `clusterFrame`, `isEnabled`,
  optional `extension`) — independent of react-router.
- `packages/core/src/renderer/routes/matching-route.injectable.ts` computes the
  matching route from `routesInjectable` + `currentPathInjectable`.
- `packages/core/src/renderer/routes/current-route-component.injectable.ts`
  selects the component to render.
- `packages/core/src/renderer/frames/cluster-frame/cluster-frame-layout-child-component.injectable.tsx`
  renders the selected `<Component/>` directly.

So react-router's declarative rendering is **nearly vestigial** for the primary
navigation path, which is exactly the precondition the issue named for
preferring approach (b).

### 2.4 The remaining `react-router` surface

What still imports from `react-router` / `react-router-dom` (renderer, tests
excluded):

| Surface | Where | Notes |
| --- | --- | --- |
| `<Router>` context provider | `renderer/frames/routing-react-application-hoc.injectable.tsx` | Only exists to satisfy `Link`/`NavLink`/`Redirect`. |
| `<Switch>` + `<Route>` | `renderer/components/layout/tab-layout.tsx` | The **only** declarative route rendering left. |
| `<Redirect>` | `tab-layout.tsx`, `renderer/components/cluster-manager/cluster-manager.tsx`, `cluster-frame-layout-child-component.injectable.tsx` | 3 call sites. |
| `Link` / `NavLink` | ~28 files import from `react-router-dom` | Used for hrefs; need the router context or a replacement `Link`. |
| `matchPath` (pure fn) | `routes/matching-route`, `routes/route-path-parameters`, `routes/route-is-active`, `navigation/match-route`, `common/protocol-handler/router.ts` | Pure function; the biggest semantic detail (see §4). |
| `mobx-observable-history` | ~15 files via `observableHistoryInjectionToken` | Observable location wrapper; must be replaced regardless of (a)/(b). |

Note the `<Switch>` matches in `features/preferences/**` and
`renderer/components/switch/**` are Freelens' **own** UI `Switch` toggle
component, not the react-router `Switch`. Only `tab-layout.tsx` uses the
react-router `Switch`.

### 2.5 The extension-facing routing contract is internal

Extensions register `globalPages` / `clusterPages` (`PageRegistration`) and
navigate via `navigateToRoute` / `getExtensionPageParameters`
(`packages/core/src/extensions/lens-renderer-extension.ts`). None of that is
react-router's API. Dropping react-router therefore does **not** change the
extension contract, provided the internal `Route`/page abstractions keep their
current shape.

## 3. Decision

**Adopt approach (b): drop `react-router` in favor of the internal registry.**

Rationale:

- Matching and rendering of the primary route tree are already handled by the
  internal registry (§2.3); RR5's declarative components survive in only a
  handful of places (§2.4).
- No react-router hooks are in use (§2.2), so there is no `useNavigate` /
  `useParams` migration surface.
- The extension contract is independent of react-router (§2.5), so (b) is not
  extension-breaking.
- (b) permanently removes two unmaintained dependencies (`react-router` and
  `mobx-observable-history`) instead of trading one unmaintained pair for a
  newer major that would still need the same in-house observable wrapper.

Approach (a) remains the documented fallback if, during the `matchPath` or
`Link` replacement work below, the internal registry turns out not to cover a
needed behavior.

## 4. Known semantic detail: `matchPath` / `path-to-regexp`

`path-to-regexp` `^8.4.2` is already a workspace dependency, but `react-router`
5 bundles `path-to-regexp` **v1** internally, and v8 changed its pattern syntax
(named parameters, wildcards, and optional segments differ). The in-house
`matchPath` replacement must therefore be validated against the actual route
patterns in the registry rather than assumed to be a drop-in — this is the
single highest-risk detail of approach (b) and should get its own focused PR
with unit tests over the real route patterns.

## 5. Proposed follow-up PR sequence

Each is its own PR to keep history bisectable:

1. **In-house observable history wrapper** — replace `mobx-observable-history`
   with a thin mobx wrapper over the history v5 navigator/location behind the
   existing `observableHistoryInjectionToken`, so the ~15 consumers are
   unchanged. Removes the `mobx-observable-history` dependency.
2. **In-house `matchPath`** — replace the 5 `matchPath` call sites with a
   registry-validated matcher (see §4), with unit tests.
3. **Replace `Link` / `NavLink`** — an internal `<Link>`/`<NavLink>` over the
   observable history + `navigateTo`, dropping the `react-router-dom` import in
   ~28 files.
4. **Replace `<Redirect>` and `<Switch>`/`<Route>`** — the 3 `Redirect` sites
   and `tab-layout.tsx`, then remove the `<Router>` HOC.
5. **Remove dependencies and the shim** — drop `react-router`,
   `react-router-dom`, and the `toHistoryV4` compat shim once nothing consumes
   the v4 surface. Done: the shim's compat logic (v5 `back`/`forward` →
   v4-style `goBack`/`goForward`, `length`, two-argument `listen`) moved into
   the in-house `ObservableHistory` wrapper, which now consumes native
   `history` v5 directly; `history-compat.ts` was deleted. `react-router` /
   `react-router-dom` (and `@types/*`) were removed from `core`, `extensions`,
   and `utilities`, dropping the transitive `history` v4. The last
   `react-router` type usage (`RouteProps` in `utilities/src/buildUrl.ts`) was
   inlined. **Extension-facing:** the `Freelens.ReactRouter` /
   `Freelens.ReactRouterDom` bundle re-exports were removed — extensions that
   need react-router must now bundle their own copy.
6. **Verify** — smoke-test cluster views, drawers, breadcrumbs/back-forward,
   deep links, and extension-registered routes; confirm the extension-facing
   routing API still works.

## 6. Out of scope (deferred to Phase 3)

- Bumping to React 19, `@testing-library/react` 16, `react-window` v2.
- Enabling `StrictMode`.
