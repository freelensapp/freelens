/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The runtime half of the extension-API surface check.
//
// **What it checks.** That `@freelensapp/extensions` exports `Common`, `Main`
// and `Renderer`; that each of the three carries exactly the members listed
// below; and that every sub-namespace exists, is non-empty, and still carries a
// handful of anchor symbols. The three top-level lists are the contract — they
// are C5's table in `docs/v2-extension-api.md`, and a change to one of them is
// a change to the API that has to be made on purpose and read in review.
//
// **What it deliberately does not check.** The membership of a sub-namespace,
// one name at a time. This file used to do that: 809 of its 958 lines were
// quoted names, most of them incidental arrivals through the star re-exports in
// `renderer-api/components.ts`. #2366 then tried the thorough version of the
// same idea — an API Extractor report, committed and diffed in CI (#2476) — and
// it was withdrawn for the same reason the list is gone: a report tracks the
// *transitive closure* of the surface, while the contract is namespace
// membership, so 163 symbols nobody intends as API were in the file and
// refactoring a host-side dependency bag showed up as a contract diff. Neither
// version distinguished "the API broke" from "the API changed", which is the
// only distinction a check like this is for.
//
// **The anchors** are therefore chosen, not enumerated: the symbols whose
// disappearance means something is genuinely broken. Two sources rather than
// taste — what the two published extensions actually use
// (`freelens-fluxcd-extension`, `freelens-gateway-api-extension`, the pair
// #2365 verified against) and the symbols whose *behaviour* is frozen under
// C14. They are commented where the reason is not obvious. A handful per
// namespace is the intended size; a list that grows whenever somebody exports
// something has turned back into the thing that was removed.
//
// **Types are not visible here at all.** `Object.keys` sees runtime values, so
// this file cannot see a type that stops being nameable — the #2365 class of
// defect, which cost `SecurityContext` the whole v2 line. That half lives in
// `./extension-api.types.ts`, compiled by `pnpm type:check`, and in
// `packages/fixture-extension/src/contract-types.ts`, compiled against the
// built `dist/extension-api.d.ts`.
//
// `Object.keys` of a namespace is its export list; it is sorted here rather
// than relied on to come out sorted, because the namespace objects are produced
// by the bundler's interop and follow source order.

import * as extensions from "../extension-api";

const commonNames = ["App", "Catalog", "Clusters", "EventBus", "Proxy", "Store", "Types", "Util", "logger"];
const mainNames = ["Catalog", "Ipc", "K8s", "K8sApi", "LensExtension", "Navigation", "Power", "Util"];
const rendererNames = ["Catalog", "Component", "Ipc", "K8s", "K8sApi", "LensExtension", "Navigation", "Theme", "Util"];

const commonAnchors: Record<string, readonly string[]> = {
  App: ["appName", "version"],
  Catalog: ["CatalogEntity", "KubernetesCluster"],
  Clusters: ["ClusterConnectionStatus"],
  EventBus: ["appEventBus"],
  Proxy: ["resolveSystemProxy"],
  Store: ["ExtensionStore"],
  // `bytesToUnits` and `unitsToBytes` are destructured out of `Common.Util` by
  // the fluxcd extension; the other two are the utilities every renderer-side
  // extension reaches for.
  Util: ["bytesToUnits", "cssNames", "stopPropagation", "unitsToBytes"],
};

const mainAnchors: Record<string, readonly string[]> = {
  Catalog: ["catalogEntities", "getClusterById"],
  K8s: ["applyOnCluster", "getResource", "queryCluster"],
  // The five symbols a custom-resource extension is built out of. Both
  // published extensions subclass `LensExtensionKubeObject`, pair it with a
  // `KubeApi` and a `KubeObjectStore`, and register the result with
  // `apiManager`.
  K8sApi: ["KubeApi", "KubeObject", "KubeObjectStore", "LensExtensionKubeObject", "apiManager"],
  Navigation: ["navigate"],
  Power: ["onResume", "onShutdown", "onSuspend"],
  // `fetch` is the whole of C12: an extension that loses it has no HTTP that
  // honours the user's proxy and CA settings.
  Util: ["bytesToUnits", "fetch"],
};

const rendererAnchors: Record<string, readonly string[]> = {
  Catalog: ["activeCluster", "catalogEntities"],
  // `MonacoEditor` is here for C3 rather than for its own sake: it is the
  // component that fails if the host stops being the single instance.
  Component: ["Badge", "DrawerItem", "Icon", "KubeObjectListLayout", "MenuItem", "MonacoEditor"],
  K8s: ["applyOnCluster", "getResource", "queryCluster"],
  K8sApi: [
    "CustomResourceDefinition",
    "KubeApi",
    "KubeObject",
    "KubeObjectStore",
    "LensExtensionKubeObject",
    // `ServicePort` cannot be withdrawn: it is the return type of
    // `Service.getPorts()` (#2365).
    "ServicePort",
    "apiManager",
    // The injected store singletons both published extensions read.
    "crdStore",
    // One of the eight symbols #2365 considered and kept, so its output format
    // — `key=value:effect` — is frozen until 3.0.0 along with the symbol.
    "formatNodeTaint",
    "namespaceStore",
  ],
  Navigation: ["getDetailsUrl", "getMaybeDetailsUrl", "navigate"],
  Theme: ["activeTheme"],
  Util: ["bytesToUnits", "cssNames", "fetch", "stopPropagation"],
};

interface SubNamespaceReport {
  empty: string[];
  missing: Record<string, string[]>;
}

// Reports rather than asserts, so a failure names the missing anchors instead
// of diffing a hundred-entry member list against another one.
const inspect = (namespace: object, anchors: Record<string, readonly string[]>): SubNamespaceReport => {
  const report: SubNamespaceReport = { empty: [], missing: {} };

  for (const [name, expected] of Object.entries(anchors)) {
    const members = new Set(Object.keys((namespace as Record<string, object>)[name] ?? {}));

    if (members.size === 0) {
      report.empty.push(name);
    }

    const absent = expected.filter((member) => !members.has(member));

    if (absent.length > 0) {
      report.missing[name] = absent;
    }
  }

  return report;
};

const intact: SubNamespaceReport = { empty: [], missing: {} };

describe("extensions API surface", () => {
  it("exports Common, Main and Renderer", () => {
    expect(Object.keys(extensions).sort()).toEqual(["Common", "Main", "Renderer"]);
  });

  it("exports a stable set of names from Common", () => {
    expect(Object.keys(extensions.Common).sort()).toEqual(commonNames);
  });

  it("exports a stable set of names from Main", () => {
    expect(Object.keys(extensions.Main).sort()).toEqual(mainNames);
  });

  it("exports a stable set of names from Renderer", () => {
    expect(Object.keys(extensions.Renderer).sort()).toEqual(rendererNames);
  });

  it("keeps the Common sub-namespaces populated and anchored", () => {
    expect(inspect(extensions.Common, commonAnchors)).toEqual(intact);
  });

  it("keeps the Main sub-namespaces populated and anchored", () => {
    expect(inspect(extensions.Main, mainAnchors)).toEqual(intact);
  });

  it("keeps the Renderer sub-namespaces populated and anchored", () => {
    expect(inspect(extensions.Renderer, rendererAnchors)).toEqual(intact);
  });

  // `Common.Types` is the one namespace with nothing behind it at runtime, and
  // that is not a defect to be fixed by adding a value to it: its members are
  // the registration shapes, covered in `./extension-api.types.ts` and nowhere
  // else. Asserted explicitly so the emptiness reads as intended rather than as
  // an omission from the check above.
  it("keeps Common.Types type-only", () => {
    expect(Object.keys(extensions.Common.Types)).toEqual([]);
  });
});
