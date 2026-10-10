/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The pairings `Renderer.K8sApi.detailsFor` and `menuItemFor` must reject,
// checked against the built `dist/extension-api.d.ts`. A component written for
// `Pod` and registered for `Deployment` carries a `@ts-expect-error`, so a
// declaration that loses the tie between the class and the component fails the
// fixture's `type:check` with an unused directive. The positive pairings are
// the registrations in `./index.tsx`.
//
// Nothing imports this file, so it is part of no bundle, and the function
// below is never called: only the types of its body matter.

import type { Common, Renderer } from "@freelensapp/extensions";

import type { ComponentClass, FunctionComponent } from "react";

declare const detailsFor: typeof Renderer.K8sApi.detailsFor;
declare const menuItemFor: typeof Renderer.K8sApi.menuItemFor;
declare const Deployment: typeof Renderer.K8sApi.Deployment;
declare const PodDetails: FunctionComponent<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Pod>>;
declare const PodDetailsClass: ComponentClass<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Pod>>;
declare const PodMenuItem: FunctionComponent<Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>>;
declare const PodMenuItemClass: ComponentClass<Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>>;

export function mismatchedPairings() {
  return [
    // @ts-expect-error a function component written for `Pod`, registered for `Deployment`
    detailsFor(Deployment, { Details: PodDetails }),
    // @ts-expect-error a class component written for `Pod`, registered for `Deployment`
    detailsFor(Deployment, { Details: PodDetailsClass }),
    // @ts-expect-error a function component written for `Pod`, registered for `Deployment`
    menuItemFor(Deployment, { MenuItem: PodMenuItem }),
    // @ts-expect-error a class component written for `Pod`, registered for `Deployment`
    menuItemFor(Deployment, { MenuItem: PodMenuItemClass }),
  ];
}
