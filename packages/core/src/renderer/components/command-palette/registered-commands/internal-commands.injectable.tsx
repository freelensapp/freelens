/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import navigateToCatalogInjectable from "../../../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import navigateToEntitySettingsInjectable from "../../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
// TODO: Importing from features is not OK. Make commands to comply with Open Closed Principle to allow moving implementation under a feature
import navigateToPreferencesInjectable from "../../../../features/preferences/common/navigate-to-preferences.injectable";
import { ClustersSearchCommand } from "../../clusters";
import createTerminalTabInjectable from "../../dock/terminal/create-terminal-tab.injectable";
import hasCatalogEntitySettingItemsInjectable from "../../entity-settings/has-settings.injectable";
import { HotbarAddCommand } from "../../hotbar/hotbar-add-command";
import { HotbarRemoveCommand } from "../../hotbar/hotbar-remove-command";
import { HotbarRenameCommand } from "../../hotbar/hotbar-rename-command";
import { HotbarSwitchCommand } from "../../hotbar/hotbar-switch-command";
import commandOverlayInjectable from "../command-overlay.injectable";

import type { DockTabCreate } from "../../dock/dock/store";
import type { HasCatalogEntitySettingItems } from "../../entity-settings/has-settings.injectable";
import type { CommandContext, CommandRegistration } from "./commands";

export function isKubernetesClusterActive(context: CommandContext): boolean {
  return context.entity?.kind === "KubernetesCluster";
}

interface Dependencies {
  openCommandDialog: (component: React.ReactElement) => void;
  hasCatalogEntitySettingItems: HasCatalogEntitySettingItems;
  createTerminalTab: () => DockTabCreate;
  navigateToPreferences: () => void;
  navigateToCatalog: () => void;
  navigateToEntitySettings: (entityId: string) => void;
}

function getInternalCommands(dependencies: Dependencies): CommandRegistration[] {
  return [
    {
      id: "app.showCatalog",
      title: "Catalog: Open",
      action: () => dependencies.navigateToCatalog(),
    },
    {
      id: "app.showPreferences",
      title: "Preferences: Open",
      action: () => dependencies.navigateToPreferences(),
    },
    {
      id: "clusters.search",
      title: "Clusters: Search ...",
      action: () => dependencies.openCommandDialog(<ClustersSearchCommand />),
    },
    {
      id: "entity.viewSettings",
      title: ({ entity }) => `${entity.kind}/${entity.getName()}: View Settings`,
      action: ({ entity }) => dependencies.navigateToEntitySettings(entity.getId()),
      isActive: ({ entity }) => entity && dependencies.hasCatalogEntitySettingItems(entity),
    },
    {
      id: "cluster.openTerminal",
      title: "Cluster: Open terminal",
      action: () => dependencies.createTerminalTab(),
      isActive: isKubernetesClusterActive,
    },
    {
      id: "hotbar.switchHotbar",
      title: "Hotbar: Switch ...",
      action: () => dependencies.openCommandDialog(<HotbarSwitchCommand />),
    },
    {
      id: "hotbar.addHotbar",
      title: "Hotbar: Add Hotbar ...",
      action: () => dependencies.openCommandDialog(<HotbarAddCommand />),
    },
    {
      id: "hotbar.removeHotbar",
      title: "Hotbar: Remove Hotbar ...",
      action: () => dependencies.openCommandDialog(<HotbarRemoveCommand />),
    },
    {
      id: "hotbar.renameHotbar",
      title: "Hotbar: Rename Hotbar ...",
      action: () => dependencies.openCommandDialog(<HotbarRenameCommand />),
    },
  ];
}

const internalCommandsInjectable = getInjectable({
  id: "internal-commands",

  instantiate: (di) =>
    getInternalCommands({
      openCommandDialog: di.inject(commandOverlayInjectable).open,
      hasCatalogEntitySettingItems: di.inject(hasCatalogEntitySettingItemsInjectable),
      createTerminalTab: di.inject(createTerminalTabInjectable),
      navigateToPreferences: di.inject(navigateToPreferencesInjectable),
      navigateToCatalog: di.inject(navigateToCatalogInjectable),
      navigateToEntitySettings: di.inject(navigateToEntitySettingsInjectable),
    }),
});

export default internalCommandsInjectable;
