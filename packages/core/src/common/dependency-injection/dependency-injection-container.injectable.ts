/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import type { DiContainer } from "@ogre-tools/injectable";

/**
 * Provides the root (container-level) dependency-injection container.
 *
 * @ogre-tools 23 namespaces injectables registered at runtime through the
 * namespaced `di` passed into an injectable's `instantiate`: their ids get
 * prefixed with the registering injectable's id. Runtime differencing
 * registrators (see `injectableDifferencingRegistratorWith`) must register
 * against this root container instead so the registered ids stay bare — the
 * sidebar hierarchy and `data-testid`s key off those ids.
 *
 * Must be overridden with the actual container right after `createContainer`
 * in every bootstrap path (`di.override(dependencyInjectionContainerInjectable, () => di)`).
 */
const dependencyInjectionContainerInjectable = getInjectable({
  id: "dependency-injection-container",
  instantiate: (): DiContainer => {
    throw new Error(
      "Tried to inject the dependency-injection container without it being provided at bootstrap. " +
        "Call di.override(dependencyInjectionContainerInjectable, () => di) right after createContainer().",
    );
  },
});

export default dependencyInjectionContainerInjectable;
