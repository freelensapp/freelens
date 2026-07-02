/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import rendererExtensionsInjectable from "../../../../extensions/renderer-extensions.injectable";
import internalCommandsInjectable from "./internal-commands.injectable";
import sidebarNavigationCommandsInjectable from "./sidebar-navigation-commands.injectable";

import type { IComputedValue } from "mobx";

import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { CommandRegistration, RegisteredCommand } from "./commands";

interface Dependencies {
  extensions: IComputedValue<LensRendererExtension[]>;
  sidebarNavigationCommands: IComputedValue<CommandRegistration[]>;
  internalCommands: CommandRegistration[];
}

const instantiateRegisteredCommands = ({ extensions, sidebarNavigationCommands, internalCommands }: Dependencies) =>
  computed(() => {
    const result = new Map<string, RegisteredCommand>();
    const commands = [
      ...internalCommands,
      ...extensions.get().flatMap((e) => e.commands),
      ...sidebarNavigationCommands.get(),
    ];

    for (const { scope, isActive = () => true, ...command } of commands) {
      void scope;

      if (!result.has(command.id)) {
        result.set(command.id, { ...command, isActive });
      }
    }

    return result;
  });

const registeredCommandsInjectable = getInjectable({
  id: "registered-commands",

  instantiate: (di) =>
    instantiateRegisteredCommands({
      extensions: di.inject(rendererExtensionsInjectable),
      sidebarNavigationCommands: di.inject(sidebarNavigationCommandsInjectable),
      internalCommands: di.inject(internalCommandsInjectable),
    }),
});

export default registeredCommandsInjectable;
