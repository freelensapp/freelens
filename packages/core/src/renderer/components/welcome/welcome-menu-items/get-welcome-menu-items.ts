/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";

import type { IComputedValue } from "mobx";

import type { NavigateToCatalog } from "../../../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";

interface Dependencies {
  extensions: IComputedValue<LensRendererExtension[]>;
  navigateToCatalog: NavigateToCatalog;
  navigateToTerminal: () => void;
}

export const getWelcomeMenuItems = ({ extensions, navigateToCatalog, navigateToTerminal }: Dependencies) => {
  const browseClusters = {
    title: "Browse Clusters in Catalog",
    icon: "view_list",

    click: () =>
      navigateToCatalog({
        group: "entity.k8slens.dev",
        kind: "KubernetesCluster",
      }),
  };

  // A shell that belongs to no cluster, so it can be opened from here
  const openTerminal = {
    title: "Open a Terminal",
    icon: "terminal",

    click: () => navigateToTerminal(),
  };

  return computed(() => [
    browseClusters,
    openTerminal,
    ...extensions.get().flatMap((extension) => extension.welcomeMenus),
  ]);
};
