/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { disposer } from "@freelensapp/utilities";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { reaction, runInAction } from "mobx";
import { injectableDifferencingRegistratorWith } from "../../../common/utils/registrator-helper";
import { extensionRegistratorInjectionToken } from "../extension-registrator-injection-token";

import type { LensExtensionInstance } from "../../installed-extension";

export interface Extension {
  register: () => void;
  deregister: () => void;
}

// An extension's own view of the host's DI container: injecting this creates
// the view, and `deregister()` releases it.
//
// Injecting it is separate from `register()` on purpose, and the loader does it
// before it runs the author's `onActivate` (#2450). That is the lifecycle
// invariant the extension API promises: *the container exists before the
// author's first hook and is released after their last.* Only the population of
// the view -- calling the host's registrators, below -- has to follow
// activation, because activation can register catalog categories those
// registrators need to see.
//
// The registrators are therefore injected inside `register()` rather than in
// `instantiate`: creating the view earlier must not make anything else happen
// earlier with it.
const extensionInjectable = getInjectable({
  id: "extension",

  instantiate: (parentDi, instance): Extension => {
    const extensionInjectable = getInjectable({
      id: `extension-${instance.sanitizedExtensionId}`,

      instantiate: (childDi) => {
        const reactionDisposer = disposer();
        const injectableDifferencingRegistrator = injectableDifferencingRegistratorWith(childDi);

        return {
          register: () => {
            const extensionRegistrators = childDi.injectMany(extensionRegistratorInjectionToken);

            for (const extensionRegistrator of extensionRegistrators) {
              const injectables = extensionRegistrator(instance);

              if (Array.isArray(injectables)) {
                runInAction(() => {
                  injectableDifferencingRegistrator(injectables);
                });
              } else {
                reactionDisposer.push(
                  reaction(() => injectables.get(), injectableDifferencingRegistrator, {
                    fireImmediately: true,
                  }),
                );
              }
            }
          },

          deregister: () => {
            reactionDisposer();

            runInAction(() => {
              parentDi.deregister(extensionInjectable);
            });
          },
        };
      },
    });

    runInAction(() => {
      parentDi.register(extensionInjectable);
    });

    return parentDi.inject(extensionInjectable);
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, instance: LensExtensionInstance) => instance,
  }),
});

export default extensionInjectable;
