/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { computed, untracked } from "mobx";
import extensionIsEnabledForClusterInjectable from "../../extensions/extension-loader/extension-is-enabled-for-cluster.injectable";
import activeKubernetesClusterInjectable from "../cluster-frame-context/active-kubernetes-cluster.injectable";

import type { LensRendererExtension } from "../../extensions/lens-renderer-extension";

const extensionShouldBeEnabledForClusterFrameInjectable = getInjectable({
  id: "extension-should-be-enabled-for-cluster-frame",

  instantiate: (di, extension: LensRendererExtension) => {
    const activeKubernetesCluster = di.inject(activeKubernetesClusterInjectable);

    const result = computed(() => {
      const cluster = activeKubernetesCluster.get();

      return cluster && untracked(() => di.inject(extensionIsEnabledForClusterInjectable, { extension, cluster }));
    });

    // The per-cluster result also serves unobserved reads. MobX can release
    // these computeds and their active-cluster dependency after the last consumer.
    return {
      value: computed(() => result.get()?.get() ?? false),
      pending: computed(() => {
        const check = result.get();

        return check !== null && check.get() === undefined;
      }),
    };
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, extension: LensRendererExtension) => extension,
  }),
});

export default extensionShouldBeEnabledForClusterFrameInjectable;
