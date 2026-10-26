/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DiContainerForInjection, Injectable } from "@ogre-tools/injectable";

// Register new injectables and deregister removed injectables by id.
//
// A registrator remembers what it registered, so each source of injectables
// needs its own: called with another source's list, it would deregister
// everything the first one gave it. Sources build new injectable objects every
// time they run, while `di.deregister()` matches by object and throws for one
// it did not register, so the object to deregister is the registered one, not
// the one the previous run of the source built.
//
// Note on the `di` argument: @ogre-tools 23 prefixes ids registered through the
// namespaced `di` passed into an injectable's instantiate with the registering
// injectable's id. For app-lifetime registrations whose ids must stay bare
// (e.g. sidebar items keyed by id in the hierarchy and `data-testid`s), pass the
// root container via `dependencyInjectionContainerInjectable`. Extension-scoped
// registrations instead pass their extension's child `di` on purpose, so the
// items are cleaned up when that child container is disposed on disable.

export const injectableDifferencingRegistratorWith = (di: DiContainerForInjection) => {
  const registered = new Map<string, Injectable<any, any, any>>();

  return (injectables: Injectable<any, any, any>[]) => {
    const current = new Map(injectables.map((inj) => [inj.id, inj]));
    const toRemove = [...registered].filter(([id]) => !current.has(id));
    const toAdd = [...current].filter(([id]) => !registered.has(id));

    for (const [id] of toRemove) {
      registered.delete(id);
    }

    di.deregister(...toRemove.map(([, inj]) => inj));
    di.register(...toAdd.map(([, inj]) => inj));

    for (const [id, inj] of toAdd) {
      registered.set(id, inj);
    }
  };
};
