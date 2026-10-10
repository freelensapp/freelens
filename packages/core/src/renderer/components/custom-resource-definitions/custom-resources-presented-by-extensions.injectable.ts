/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import { getCustomResourceKey } from "./custom-resource-registration";
import { extensionCustomResourceInjectionToken } from "./extension-custom-resource-injection-token";

/**
 * The custom resources the enabled extensions present with pages of their own,
 * by `getCustomResourceKey()`, each with the name of the extension that
 * registered it.
 */
const customResourcesPresentedByExtensionsInjectable = getInjectable({
  id: "custom-resources-presented-by-extensions",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);
    const registered = computedInjectMany(extensionCustomResourceInjectionToken);

    return computed(
      () =>
        new Map(
          registered
            .get()
            .filter(({ enabled }) => enabled.get())
            .map(({ group, plural, extensionName }) => [getCustomResourceKey(group, plural), extensionName]),
        ),
    );
  },
});

export default customResourcesPresentedByExtensionsInjectable;
