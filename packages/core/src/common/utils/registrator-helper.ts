/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { iter } from "@freelensapp/utilities";

import type { DiContainerForInjection, Injectable } from "@ogre-tools/injectable";

// Register new injectables and deregister removed injectables by id.
//
// Note on the `di` argument: @ogre-tools 23 prefixes ids registered through the
// namespaced `di` passed into an injectable's instantiate with the registering
// injectable's id. For app-lifetime registrations whose ids must stay bare
// (e.g. sidebar items keyed by id in the hierarchy and `data-testid`s), pass the
// root container via `dependencyInjectionContainerInjectable`. Extension-scoped
// registrations instead pass their extension's child `di` on purpose, so the
// items are cleaned up when that child container is disposed on disable.

export const injectableDifferencingRegistratorWith =
  (di: DiContainerForInjection) =>
  (rawCurrent: Injectable<any, any, any>[], rawPrevious: Injectable<any, any, any>[] = []) => {
    const current = new Map(rawCurrent.map((inj) => [inj.id, inj]));
    const previous = new Map(rawPrevious.map((inj) => [inj.id, inj]));
    const toAdd = iter
      .chain(current.entries())
      .filter(([id]) => !previous.has(id))
      .collect((entries) => new Map(entries));
    const toRemove = iter
      .chain(previous.entries())
      .filter(([id]) => !current.has(id))
      .collect((entries) => new Map(entries));

    di.deregister(...toRemove.values());
    di.register(...toAdd.values());
  };
