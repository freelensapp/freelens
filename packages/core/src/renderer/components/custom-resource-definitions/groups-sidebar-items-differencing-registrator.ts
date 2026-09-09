/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { injectableDifferencingRegistratorWith } from "../../../common/utils/registrator-helper";

import type { SidebarItemRegistration } from "@freelensapp/cluster-sidebar";
import type { DiContainerForInjection, Injectable } from "@ogre-tools/injectable";

// `injectableDifferencingRegistratorWith` only diffs by id: if a CRD group's
// order or nesting changes but its id doesn't, nothing gets re-registered and
// the sidebar keeps showing the stale parentId/orderNumber/title. Comparing a
// small content signature on top of the shared by-id diff catches that case,
// without changing the shared helper itself (also used by the extension
// enable/disable lifecycle and setup-auto-crd-api-creations, where this extra
// content diffing isn't wanted).
function contentSignatureOf(injectable: Injectable<any, any, any>, di: DiContainerForInjection): string {
  const { parentId, orderNumber, title } = injectable.instantiate(di, undefined) as SidebarItemRegistration;
  return JSON.stringify([parentId, orderNumber, title]);
}

export const differencingRegistratorWithContentCheck =
  (di: DiContainerForInjection) =>
  (current: Injectable<any, any, any>[], previous: Injectable<any, any, any>[] = []) => {
    // Adds/removes ids present on only one side, unchanged.
    injectableDifferencingRegistratorWith(di)(current, previous);

    const previousById = new Map(previous.map((injectable) => [injectable.id, injectable]));
    for (const currentInjectable of current) {
      const previousInjectable = previousById.get(currentInjectable.id);
      if (!previousInjectable || previousInjectable === currentInjectable) continue;
      if (contentSignatureOf(currentInjectable, di) !== contentSignatureOf(previousInjectable, di)) {
        di.deregister(previousInjectable);
        di.register(currentInjectable);
      }
    }
  };
