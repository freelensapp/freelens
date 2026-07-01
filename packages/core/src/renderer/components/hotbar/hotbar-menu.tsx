/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./hotbar-menu.scss";

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "react-beautiful-dnd";
import { UserPreferencesState } from "../../../extensions/common-api/app";
import activeHotbarInjectable from "../../../features/hotbar/storage/common/active.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import { HotbarEntityIcon } from "./hotbar-entity-icon";
import { HotbarIcon } from "./hotbar-icon";
import { HotbarSelector } from "./hotbar-selector";

import type { IClassName } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { Hotbar } from "../../../features/hotbar/storage/common/hotbar";
import type { HotbarItem } from "../../../features/hotbar/storage/common/types";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";

export interface HotbarMenuProps {
  className?: IClassName;
}

interface Dependencies {
  activeHotbar: IComputedValue<Hotbar | undefined>;
  entityRegistry: CatalogEntityRegistry;
  userPreferencesState: UserPreferencesState;
}

const NonInjectedHotbarMenu = observer((props: Dependencies & HotbarMenuProps) => {
  const { activeHotbar, entityRegistry, userPreferencesState, className } = props;

  const [draggingOver, setDraggingOver] = useState(false);
  const [isHotbarVisible, setIsHotbarVisible] = useState(false);
  const isHotbarVisibleRef = useRef(false);
  const hotbar = activeHotbar.get();
  const items = hotbar?.items.slice() ?? [];
  const entities = entityRegistry.entities;

  useEffect(() => {
    if (!userPreferencesState.hotbarAutoHide) {
      setIsHotbarVisible(false);
      isHotbarVisibleRef.current = false;
      return;
    }

    setIsHotbarVisible(false);
    isHotbarVisibleRef.current = false;

    const handleMouseMove = (event: MouseEvent) => {
      const hotbarWidth = 75;
      const triggerZone = 10;
      const hideThreshold = hotbarWidth + 10;

      if (event.clientX <= triggerZone && !isHotbarVisibleRef.current) {
        isHotbarVisibleRef.current = true;
        setIsHotbarVisible(true);
      } else if (event.clientX > hideThreshold && isHotbarVisibleRef.current) {
        isHotbarVisibleRef.current = false;
        setIsHotbarVisible(false);
      }
      // Between triggerZone and hideThreshold, maintain current state
    };

    const handleTriggerZoneEnter = () => {
      if (!isHotbarVisibleRef.current) {
        isHotbarVisibleRef.current = true;
        setIsHotbarVisible(true);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    const triggerZone = document.querySelector(".hotbar-trigger-zone");
    if (triggerZone) {
      triggerZone.addEventListener("mouseenter", handleTriggerZoneEnter);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);

      if (triggerZone) {
        triggerZone.removeEventListener("mouseenter", handleTriggerZoneEnter);
      }
    };
  }, [userPreferencesState.hotbarAutoHide]);

  const getEntity = (item: HotbarItem) => entities.get(item.entity.uid);
  const onDragStart = () => setDraggingOver(true);
  const onDragEnd = (result: DropResult) => {
    setDraggingOver(false);

    const { source, destination } = result;

    if (!destination) {
      // Dropped outside of the list
      return;
    }

    hotbar?.restack(source.index, destination.index);
  };
  const removeItem = (entityId: string) => {
    hotbar?.removeEntity(entityId);
  };
  const renderItems = () => (
    <Droppable droppableId="hotbar-items" direction="vertical">
      {(provided) => (
        <div className="HotbarItems flex column gaps" ref={provided.innerRef} {...provided.droppableProps}>
          {items.map((item, index) => {
            const entity = getEntity(item);

            return (
              <Draggable draggableId={item.entity.uid} key={item.entity.uid} index={index}>
                {(provided, snapshot) => (
                  <div
                    className="HotbarItem"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={provided.draggableProps.style}
                  >
                    {entity ? (
                      <HotbarEntityIcon
                        entity={entity}
                        onClick={() => entityRegistry.onRun(entity)}
                        className={cssNames({ isDragging: snapshot.isDragging })}
                        remove={removeItem}
                        size={40}
                      />
                    ) : (
                      <HotbarIcon
                        uid={`hotbar-icon-${item.entity.uid}`}
                        title={item.entity.name}
                        source={item.entity.source ?? "local"}
                        tooltip={`${item.entity.name} (${item.entity.source})`}
                        menuItems={[
                          {
                            title: "Remove from Hotbar",
                            onClick: () => removeItem(item.entity.uid),
                          },
                        ]}
                        disabled
                        size={40}
                      />
                    )}
                  </div>
                )}
              </Draggable>
            );
          })}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  const handleMouseLeave = () => {
    if (userPreferencesState.hotbarAutoHide && isHotbarVisibleRef.current) {
      isHotbarVisibleRef.current = false;
      setIsHotbarVisible(false);
    }
  };

  return (
    <div
      className={cssNames(
        "HotbarMenu flex column",
        {
          draggingOver,
          autoHide: userPreferencesState.hotbarAutoHide,
          visible: isHotbarVisible,
        },
        className,
      )}
      onMouseLeave={handleMouseLeave}
    >
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {renderItems()}
      </DragDropContext>
      <HotbarSelector />
    </div>
  );
});

export const HotbarMenu = withInjectables<Dependencies, HotbarMenuProps>(NonInjectedHotbarMenu, {
  getProps: (di, props) => ({
    ...props,
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
    activeHotbar: di.inject(activeHotbarInjectable),
    userPreferencesState: di.inject(userPreferencesStateInjectable),
  }),
});
