# Freelens v2 Routing Modernization — Playwright MCP smoke-test scenario

Status: verification. Tracking issue
[#2261](https://github.com/freelensapp/freelens/issues/2261); part of the
React upgrade plan [#2154](https://github.com/freelensapp/freelens/issues/2154).

This document is the concrete test scenario for the two remaining **Verify**
tasks of Phase 2 (see `docs/v2-routing-modernization.md` §5, step 6):

- **Verify navigation flows** — cluster views, drawers, breadcrumbs /
  back-forward, deep links, and extension-registered routes.
- **Verify the extension-facing routing API** still works for extensions that
  register routes/pages.

All of `react-router` / `react-router-dom` / `mobx-observable-history` /
`history` v4 and the external `path-to-regexp` are now gone; navigation runs
entirely on the in-house pieces in `@freelensapp/routing`
(`Link`/`NavLink`, `Route`/`Switch`/`Redirect`, `matchPath`, the observable
history wrapper, and the vendored `path-to-regexp` v1 engine). These flows are
not fully covered by unit tests, so this scenario drives the **running app**
to confirm no behavioral regression before Phase 3 (React 19) proceeds.

The scenario is written to be executed by an AI agent through
[Playwright MCP](https://github.com/microsoft/playwright-mcp) attached to the
dev app's CDP endpoint, but each step is a plain manual check a human can run
too.

## 1. Why Playwright MCP (frame-awareness)

Freelens renders each connected cluster in a **cross-origin**
`<clusterId>.renderer.freelens.app` iframe. A top-document-only CDP client can
drive the welcome/catalog shell but is **blind** to everything inside a cluster
(sidebar, resource lists, drawers). Playwright traverses cross-origin frames and
reaches the cluster views, so it is the right tool for this scenario — the same
reason the existing `freelens/integration` Playwright suite operates on a
`Frame`, not just the `Page`. See the "Inspecting the running dev app from an AI
agent" section of [`DEVELOPMENT.md`](../DEVELOPMENT.md) for the rationale.

Throughout this document:

- **top page** = the catalog/welcome shell (`https://renderer.freelens.app`).
- **cluster frame** = the per-cluster iframe
  (`#cluster-frame-<entityId>` → `…renderer.freelens.app/…`). Sidebar clicks,
  resource lists, and drawers live **here**, not on the top page.

## 2. Prerequisites

1. A local **kind** (or any) Kubernetes cluster reachable from the current
   kubeconfig, so at least one cluster entity appears in the catalog. The
   cluster-view, drawer, breadcrumb, and deep-link scenarios (B–E) need a
   connected cluster; the catalog scenario (A) and the extensions page do not.
2. The app running in dev mode with the CDP endpoint exposed:

   ```sh
   pnpm dev   # launches Electron with --remoteDebuggingPort 9223
   ```

3. Playwright MCP added at **local** scope, pointed at the dev CDP port (this is
   per-developer and intentionally not committed to `.mcp.json`):

   ```sh
   claude mcp add playwright --scope local -- \
     npx -y @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:9223
   ```

4. In Claude Code, run `/mcp` and confirm the `playwright` server is connected.

If dev mode misbehaves, the packaged-app workflow
(`pnpm build && pnpm build:app:dir && pnpm start`) also exposes the app to
Playwright via `_electron.launch`, exactly as the integration suite does.

## 3. Selector reference

Stable hooks used by the scenarios below (all verified in the current tree; the
same ones the `freelens/integration` suite relies on):

| Purpose | Selector | Where |
| --- | --- | --- |
| Welcome menu entry | `[data-testid=welcome-menu-container] li a` | top page |
| Catalog cluster row | `div.TableCell >> text='kind-<name>'` | top page |
| Cluster iframe | `#cluster-frame-<entityId>` | top page |
| Cluster sidebar (ready marker) | `[data-testid=cluster-sidebar]` | cluster frame |
| Sidebar item | `[data-testid="link-for-sidebar-item-<id>"]` | cluster frame |
| Cluster context menu | `[data-testid="sidebar-cluster-dropdown"]` | cluster frame |
| Resource detail drawer | `.Drawer` (close via the drawer's `Close` icon) | cluster frame |

> **Sidebar clicks:** the sidebar items are in-house `NavLink`s that navigate
> from their `onClick` handler and render `to=""` (the anchor calls
> `preventDefault()`, so navigation never relies on the `href`). Dispatch the
> click directly on the anchor — `frame.dispatchEvent(selector, "click")` —
> rather than a hit-tested `frame.click`, because the cluster-overview metrics
> area transiently overlays the click point right after connect. This is the
> `clickSidebarItem` helper in `freelens/integration/helpers/utils.ts`; reuse it.
>
> **`to=""` note:** under the in-house `Link`, an empty `to` resolves against
> the live observable-history location (e.g. `/workloads`), whereas
> react-router v5 resolved it against the `<Router>` location. The hrefs are
> cosmetic (clicks are `preventDefault`-ed); this only matters if a check reads
> `href` — assert on the rendered page, not the anchor `href`.

## 4. Scenarios

Each scenario names the routing internals it exercises so a failure points
straight at the responsible in-house piece.

### A. Catalog / welcome shell navigation (no cluster required)

Exercises: `<Redirect>` to the front page, `NavLink` on the top page,
`buildURL`/`navigateToRoute`, observable-history location updates.

1. Launch the app. Confirm it lands on the catalog (the welcome menu container
   is visible on the top page).
2. Click the welcome menu entry
   (`[data-testid=welcome-menu-container] li a`). Confirm the catalog view
   renders.
3. From the top-left hamburger / app menu, navigate to **Preferences** and back
   to the catalog. Confirm each view renders and the URL changes accordingly
   (`/preferences…` ↔ `/catalog`).
4. Navigate to the **Extensions** page (app menu → Extensions, or the
   `navigate-to-extensions` menu item). Confirm the extensions page renders —
   this is a top-page route rendered without any cluster frame.

**Expected:** every transition renders the target view; no blank screen, no
console error referencing `matchPath`, `path-to-regexp`, `Route`, `Switch`, or
`observableHistory`.

### B. Cluster views — sidebar navigation (cluster required)

Exercises: the internal route registry (`matchingRouteInjectable` +
`currentRouteComponentInjectable`), in-house `NavLink` active-state matching,
`matchPath` against every real cluster route pattern.

1. From the catalog, click the kind cluster row and wait for the cluster frame
   (`#cluster-frame-<entityId>`) and its `[data-testid=cluster-sidebar]`.
2. Walk the sidebar the way `cluster-pages.tests.ts` does — for each group
   (Workloads, Config, Network, Storage, User Management, Helm, Custom
   Resources) expand the parent, then click each child via
   `clickSidebarItem(frame, "link-for-sidebar-item-<id>")`.
3. For each destination confirm the page renders (e.g. a `h5.title` heading, the
   cluster-overview label, or the resource table appears).
4. Confirm the **active** sidebar item is highlighted for the current route —
   this is `NavLink`'s `isActive` running through the in-house `matchPath`.

**Expected:** every page in the `scenarios` list of
`freelens/integration/__tests__/cluster-pages.tests.ts` reaches its
`expectedSelector`, and exactly the current item shows the active class.

### C. Drawers (cluster required)

Exercises: page params over the observable history / search params, drawer
open-close driven by a URL query param (not a route change).

1. Navigate to **Workloads → Pods** (or Nodes) and wait for the table.
2. Click a table row to open the resource **detail drawer** (`.Drawer`).
   Confirm the drawer opens and the URL gains the detail query param.
3. Close the drawer via its `Close` icon. Confirm the drawer closes and the
   detail query param is removed from the URL.
4. Re-open the drawer, then use **back** (see D) and confirm the drawer state
   follows history.

**Expected:** the drawer opens/closes in step with the URL's detail param;
search-param round-trips are handled by the in-house `ObservableSearchParams`.

### D. Breadcrumbs / back-forward (cluster required)

Exercises: the in-house `ObservableHistory` `goBack`/`goForward` over native
`history` v5 (the behavior that used to come from the deleted `toHistoryV4`
shim), plus `push` vs `replace` semantics.

1. Visit three cluster pages in sequence, e.g. Pods → Deployments → Services.
2. Trigger **back** twice (browser back / `Alt+Left`, or the app's back
   affordance). Confirm you return Deployments → Pods, each rendering.
3. Trigger **forward** twice. Confirm you return Pods → Deployments → Services.
4. Confirm the sidebar active item tracks each back/forward step.

**Expected:** back/forward walk the exact visited sequence; `length` and action
(`PUSH`/`REPLACE`) behave as before the shim removal. A regression here points
at the `ObservableHistory` v5 port (`goBack`/`goForward`/`length`/two-arg
`listen`).

### E. Deep links — the `matchPath` dialect (cluster required)

Exercises: the vendored `path-to-regexp` v1 engine and in-house `matchPath`
against the **optional-parameter** route schemas that `path-to-regexp` v8 could
not express (this is the class of route that produced the
`Expected "group" to be defined` crash before the v1 unification). Navigate
directly to each URL (via the command palette, an in-app link, or by setting the
location) and confirm it resolves:

| Deep-link path | Route schema | What it stresses |
| --- | --- | --- |
| `/catalog` | `/catalog/:group?/:kind?` | both optionals absent |
| `/catalog/entity.k8s.io/kubernetescluster` | `/catalog/:group?/:kind?` | both optionals present |
| `/helm/charts` | `/helm/charts/:repo?/:chartName?` | optionals absent |
| `/helm/releases` | `/helm/releases/:namespace?/:name?` | optionals absent |
| `/port-forwards` | `/port-forwards/:forwardport?` | trailing optional |
| `/crd/:group/:name` (a real CRD) | `/crd/:group/:name` | required params captured |

1. For each row, navigate to the path and confirm the correct view renders and
   the captured params (where present) drive the content.
2. Confirm the browser/console shows **no** `Expected "…" to be defined` or
   other `path-to-regexp` error.

**Expected:** every optional-param route resolves with the params absent **and**
present; required-param routes capture their values. This is the single
highest-risk detail of the whole migration (routing-modernization doc §4).

### F. Extension-registered routes / pages

Exercises: `PageRegistration` (`globalPages` / `clusterPages`) rendering through
the internal registry, and `navigateToRoute` / `getExtensionPageParameters`.

> The bundled `@freelensapp/example-extension` is not yet migrated to v2, so the
> `extensions.tests.ts` install flow is currently `describe.skip`. Run this
> scenario with any v2-compatible extension that registers a page; if none is
> available, record it as **blocked (no v2 extension)** rather than passed.

1. Install/enable an extension that registers a page (global and/or cluster).
2. Navigate to the extension's page via its registered sidebar item or menu
   entry. Confirm the page renders inside the correct frame (global → top page;
   cluster → cluster frame).
3. If the extension page takes parameters, navigate with a parameter value and
   confirm `getExtensionPageParameters` yields it.
4. Navigate away and back. Confirm the extension route still matches.

**Expected:** extension pages register, render, and navigate exactly as before —
the extension contract is internal (routing-modernization doc §2.5) and must be
unchanged by dropping react-router.

### G. Extension-facing routing API (regression note)

The one **intended** extension-facing break in Phase 2 is the removal of the
`Freelens.ReactRouter` / `Freelens.ReactRouterDom` bundle re-exports (step 5).
This is not a bug to smoke-test but a documented breaking change:

- Confirm no first-party code imports `Common.ReactRouter*` /
  `Renderer.ReactRouter*`.
- An extension that previously did `import { Link } from "react-router-dom"` via
  the Freelens bundle must now bundle its own `react-router` **or** use the
  internal navigation API. Verify the migration note is present in
  `docs/v2-extension-migration.md` and `docs/v2-routing-modernization.md`
  §2.1 / §5.5.

## 5. Results checklist

Record pass / fail / blocked per scenario:

- [ ] **A** — Catalog / welcome shell navigation (Redirect, top-page NavLink)
- [ ] **B** — Cluster views: full sidebar walk + active-state matching
- [ ] **C** — Drawers open/close in step with the URL detail param
- [ ] **D** — Breadcrumbs / back-forward walk the visited sequence
- [ ] **E** — Deep links: every optional-param route resolves (no
      `path-to-regexp` error)
- [ ] **F** — Extension-registered route/page renders and navigates
- [ ] **G** — Extension-facing API break (`ReactRouter*` re-exports) is
      documented, not accidental

A failure in any of A–F is a routing regression; capture the console error and
map it back to the in-house piece named in that scenario. Scenario G is a
documentation/compatibility confirmation, not a runtime check.

## 6. Relationship to the existing integration suite

Scenarios **A**, **B**, **C**, and **F** overlap the Playwright specs already in
`freelens/integration/__tests__` (`cluster-pages`, `command-palette`,
`app-preferences`, `extensions`). Those run headless in CI when a kind cluster
is present (`describeIf(kindReady(...))`). This document is the **manual /
agent-driven** counterpart that additionally covers the flows the automated
suite does not assert — breadcrumb back/forward (**D**) and the optional-param
deep-link matrix (**E**) — which are exactly the behaviors most sensitive to the
routing rewrite. Where a scenario is already automated, running the spec counts
as passing that scenario; the manual pass is for the gaps.
