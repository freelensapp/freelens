/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { iter } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { broadcastMessage } from "../../../common/ipc";
import { IpcRendererNavigationEvents } from "../../../common/ipc/navigation-events";
import activeEntityInjectable from "../../api/catalog/entity/active.injectable";
import navigateInjectable from "../../navigation/navigate.injectable";
import { Select } from "../select";
import commandOverlayInjectable from "./command-overlay.injectable";
import registeredCommandsInjectable from "./registered-commands/registered-commands.injectable";

import type { IComputedValue } from "mobx";
import type { SingleValue } from "react-select";

import type { CatalogEntity } from "../../../common/catalog";
import type { Navigate } from "../../navigation/navigate.injectable";
import type { RegisteredCommand } from "./registered-commands/commands";

interface Dependencies {
  commands: IComputedValue<Map<string, RegisteredCommand>>;
  activeEntity: IComputedValue<CatalogEntity | undefined>;
  closeCommandOverlay: () => void;
  navigate: Navigate;
}

const NonInjectedCommandDialog = observer(({ commands, activeEntity, closeCommandOverlay, navigate }: Dependencies) => {
  const [searchValue, setSearchValue] = useState("");
  const entity = activeEntity.get();

  if (!entity) {
    return null;
  }

  const context = { entity };

  const executeAction = (option: SingleValue<(typeof activeCommands)[number]>) => {
    if (!option) {
      return;
    }

    try {
      closeCommandOverlay();
      option.value.action({
        ...context,
        navigate: (url, opts = {}) => {
          const { forceRootFrame = false } = opts;

          if (forceRootFrame) {
            broadcastMessage(IpcRendererNavigationEvents.NAVIGATE_IN_APP, url);
          } else {
            navigate(url);
          }
        },
      });
    } catch (error) {
      console.error("[COMMAND-DIALOG] failed to execute command", option.value.id, error);
    }
  };

  const activeCommands = iter
    .chain(commands.get().values())
    .filter((command) => {
      try {
        return command.isActive(context);
      } catch (error) {
        return void console.error(
          `[COMMAND-DIALOG]: isActive for ${command.id} threw an error, defaulting to false`,
          error,
        );
      }
    })
    .map((command) => ({
      value: command,
      label: typeof command.title === "string" ? command.title : command.title(context),
    }))
    .collect((items) => Array.from(items));

  return (
    <Select
      id="command-palette-search-input"
      menuPortalTarget={null}
      onChange={executeAction}
      components={{
        DropdownIndicator: null,
        IndicatorSeparator: null,
      }}
      menuIsOpen
      options={activeCommands}
      autoFocus={true}
      escapeClearsValue={false}
      data-test-id="command-palette-search"
      placeholder="Type a command or search&hellip;"
      onInputChange={(newValue, { action }) => {
        if (action === "input-change") {
          setSearchValue(newValue);
        }
      }}
      inputValue={searchValue}
    />
  );
});

export const CommandDialog = withInjectables<Dependencies>(NonInjectedCommandDialog, {
  getProps: (di) => ({
    commands: di.inject(registeredCommandsInjectable),
    activeEntity: di.inject(activeEntityInjectable),
    closeCommandOverlay: di.inject(commandOverlayInjectable).close,
    navigate: di.inject(navigateInjectable),
  }),
});
