/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { isKubernetesClusterActive } from "./internal-commands.injectable";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

import type { IComputedValue } from "mobx";

import type { CommandRegistration } from "./commands";

// CRD group titles embed zero-width spaces to allow line breaks in the sidebar.
const stripZeroWidthSpaces = (value: string): string => value.replaceAll("\u200b", "");

/**
 * Derives one command-palette entry per navigable sidebar leaf item.
 *
 * Grouping nodes (items with children, such as "Workloads" or CRD group
 * headers) are not emitted themselves; their titles form the breadcrumb prefix
 * for the leaves below them. Items whose title is not a plain string (possible
 * for extension-provided items) are skipped - those extensions can keep
 * registering explicit commands instead.
 */
const deriveNavigationCommands = (items: SidebarItemDeclaration[], ancestorTitles: string[]): CommandRegistration[] =>
  items.flatMap((item) => {
    if (typeof item.title !== "string") {
      return [];
    }

    const titles = [...ancestorTitles, stripZeroWidthSpaces(item.title)];

    if (item.children.length > 0) {
      return deriveNavigationCommands(item.children, titles);
    }

    return [
      {
        id: `navigation.${item.id}`,
        title: titles.join(": "),
        isActive: (context) => isKubernetesClusterActive(context) && item.isVisible.get(),
        action: () => item.onClick(),
      } satisfies CommandRegistration,
    ];
  });

const sidebarNavigationCommandsInjectable = getInjectable({
  id: "sidebar-navigation-commands",

  instantiate: (di): IComputedValue<CommandRegistration[]> => {
    const sidebarItems = di.inject(sidebarItemsInjectable);

    return computed(() => deriveNavigationCommands(sidebarItems.get(), []));
  },
});

export default sidebarNavigationCommandsInjectable;
