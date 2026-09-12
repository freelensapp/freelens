/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// What is left of the extension-API surface check after #2451.
//
// This file used to enumerate about a hundred names by hand with
// `toHaveProperty`. That list checked no types, covered an arbitrary subset of
// the surface, and went stale the moment somebody changed the API without
// remembering it existed. The three things it was reaching for now live where
// they can actually fail:
//
//  - **types** — `packages/fixture-extension/src/contract-types.ts` names types
//    out of all three namespaces in real signatures, compiled against the built
//    `dist/extension-api.d.ts`. A re-export that disappears breaks that build,
//    and a symbol re-exported as a value but not as a type is not nameable
//    there at all (#2365), which a property list cannot see.
//  - **behaviour and instance identity** — `./fixture-extension.test.tsx` loads
//    the fixture's built bundle and drives it through the host.
//  - **runtime presence of the whole surface** — below. The fixture only reaches
//    the handful of symbols it uses, so the rest still needs an assertion; it is
//    a snapshot of the exported names rather than a hand-picked list, so adding
//    or removing one is a reviewed diff instead of a silent change.
//
// `Object.keys` of a namespace is its export list; it is sorted here rather
// than relied on to come out sorted, because the namespace objects are produced
// by the bundler's interop and follow source order. Type-only namespaces
// (`Common.Types`) contribute nothing at runtime and snapshot as empty, which is
// itself the point: those are covered at the type level and nowhere else.

import * as extensions from "../extension-api";

describe("extensions API surface", () => {
  it("exports Common, Main and Renderer", () => {
    expect(Object.keys(extensions).sort()).toEqual(["Common", "Main", "Renderer"]);
  });

  it("exports a stable set of names from Common", () => {
    expect(Object.keys(extensions.Common).sort()).toMatchSnapshot();
  });

  it("exports a stable set of names from each Common namespace", () => {
    expect({
      App: Object.keys(extensions.Common.App).sort(),
      Catalog: Object.keys(extensions.Common.Catalog).sort(),
      Clusters: Object.keys(extensions.Common.Clusters).sort(),
      EventBus: Object.keys(extensions.Common.EventBus).sort(),
      Proxy: Object.keys(extensions.Common.Proxy).sort(),
      Store: Object.keys(extensions.Common.Store).sort(),
      Types: Object.keys(extensions.Common.Types).sort(),
      Util: Object.keys(extensions.Common.Util).sort(),
    }).toMatchSnapshot();
  });

  it("exports a stable set of names from Main", () => {
    expect(Object.keys(extensions.Main).sort()).toMatchSnapshot();
  });

  it("exports a stable set of names from each Main namespace", () => {
    expect({
      Catalog: Object.keys(extensions.Main.Catalog).sort(),
      K8s: Object.keys(extensions.Main.K8s).sort(),
      K8sApi: Object.keys(extensions.Main.K8sApi).sort(),
      Navigation: Object.keys(extensions.Main.Navigation).sort(),
      Power: Object.keys(extensions.Main.Power).sort(),
      Util: Object.keys(extensions.Main.Util).sort(),
    }).toMatchSnapshot();
  });

  it("exports a stable set of names from Renderer", () => {
    expect(Object.keys(extensions.Renderer).sort()).toMatchSnapshot();
  });

  it("exports a stable set of names from each Renderer namespace", () => {
    expect({
      Catalog: Object.keys(extensions.Renderer.Catalog).sort(),
      Component: Object.keys(extensions.Renderer.Component).sort(),
      K8s: Object.keys(extensions.Renderer.K8s).sort(),
      K8sApi: Object.keys(extensions.Renderer.K8sApi).sort(),
      Navigation: Object.keys(extensions.Renderer.Navigation).sort(),
      Theme: Object.keys(extensions.Renderer.Theme).sort(),
      Util: Object.keys(extensions.Renderer.Util).sort(),
    }).toMatchSnapshot();
  });
});
