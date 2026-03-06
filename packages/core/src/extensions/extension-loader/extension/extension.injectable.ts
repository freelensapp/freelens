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

import type { LegacyLensExtension } from "@freelensapp/legacy-extensions";

import type { Injectable } from "@ogre-tools/injectable";

export interface Extension {
  register: () => void;
  deregister: () => void;
}

const extensionInjectable = getInjectable({
  id: "extension",

  instantiate: (parentDi, instance): Extension => {
    const extensionInjectable = getInjectable({
      id: `extension-${instance.sanitizedExtensionId}`,

      instantiate: (childDi) => {
        const extensionRegistrators = childDi.injectMany(extensionRegistratorInjectionToken);
        const reactionDisposer = disposer();
        const differencingRegistrator = injectableDifferencingRegistratorWith(childDi);

        // Track previous state for each registrator separately
        const previousInjectablesMap = new Map<any, Injectable<any, any, any>[]>();

        return {
          register: () => {
            for (const extensionRegistrator of extensionRegistrators) {
              const injectables = extensionRegistrator(instance);

              if (Array.isArray(injectables)) {
                runInAction(() => {
                  const previousInjectables = previousInjectablesMap.get(extensionRegistrator) || [];
                  differencingRegistrator(injectables, previousInjectables);
                  previousInjectablesMap.set(extensionRegistrator, injectables);
                });
              } else {
                // For computed injectables, we need to track state per reaction
                const reactionKey = `${extensionRegistrator.toString()}-computed`;
                reactionDisposer.push(
                  reaction(
                    () => injectables.get(),
                    (currentInjectables) => {
                      const previousInjectables = previousInjectablesMap.get(reactionKey) || [];
                      differencingRegistrator(currentInjectables, previousInjectables);
                      previousInjectablesMap.set(reactionKey, currentInjectables);
                    },
                    {
                      fireImmediately: true,
                    },
                  ),
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
    getInstanceKey: (di, instance: LegacyLensExtension) => instance,
  }),
});

export default extensionInjectable;
