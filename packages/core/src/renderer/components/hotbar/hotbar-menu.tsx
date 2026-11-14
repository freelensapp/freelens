/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./hotbar-menu.scss";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserPreferencesState } from "../../../extensions/common-api/app";
import activeHotbarInjectable from "../../../features/hotbar/storage/common/active.injectable";
import { defaultHotbarCells, isHotbarFolderItem } from "../../../features/hotbar/storage/common/types";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import commandOverlayInjectable from "../command-palette/command-overlay.injectable";
import { Menu, MenuItem } from "../menu";
import { HotbarCell } from "./hotbar-cell";
import { HotbarEntityIcon } from "./hotbar-entity-icon";
import { getHotbarFolderUid, HotbarFolderIcon } from "./hotbar-folder-icon";
import { HotbarIcon } from "./hotbar-icon";
import { HotbarNameCommand } from "./hotbar-name-command";
import { HotbarSelector } from "./hotbar-selector";

import type { IClassName, StrictReactNode } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";
import type { ReactElement } from "react";

import type { Hotbar } from "../../../features/hotbar/storage/common/hotbar";
import type { HotbarCellItem, HotbarFolder, HotbarItem } from "../../../features/hotbar/storage/common/types";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import type { CatalogEntity } from "../../api/catalog-entity";

export interface HotbarMenuProps {
  className?: IClassName;
}

interface Dependencies {
  activeHotbar: IComputedValue<Hotbar | undefined>;
  entityRegistry: CatalogEntityRegistry;
  userPreferencesState: UserPreferencesState;
  openCommandOverlay: (component: ReactElement) => void;
}

// Draggable ids of entities are their uids, folders get a prefixed id so the
// two can never collide.
const getItemId = (item: HotbarCellItem) =>
  isHotbarFolderItem(item) ? getHotbarFolderUid(item.folder.id) : item.entity.uid;

// A single grid cell acting as a @dnd-kit drop target. Its `id` is the cell
// index, so a drop resolves to `hotbar.restack(from, index)`.
function HotbarDroppableCell({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children?: StrictReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: index });

  return (
    <HotbarCell id={`hotbar-cell-${index}`} index={index} innerRef={setNodeRef} className={className}>
      {children}
    </HotbarCell>
  );
}

// The draggable icon inside an occupied cell. Its `id` is the entity uid and it
// carries the source cell index in `data` so `onDragEnd` knows where the drag
// started. The dragged visual is rendered by `<DragOverlay>`, so the in-place
// element stays put (only its `isDragging` styling changes).
const folderNameHint = 'Please provide a folder name (Press "Enter" to confirm or "Escape" to cancel)';

// The context menu of an empty cell, used to create a folder in that cell.
function HotbarEmptyCellMenu({ index, onNewFolder }: { index: number; onNewFolder: (index: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Menu
      usePortal
      htmlFor={`hotbar-cell-${index}`}
      isOpen={isOpen}
      toggleEvent="contextmenu"
      open={() => setIsOpen(true)}
      close={() => setIsOpen(false)}
    >
      <MenuItem onClick={() => onNewFolder(index)}>New Folder</MenuItem>
    </Menu>
  );
}

function HotbarDraggableIcon({
  item,
  index,
  children,
}: {
  item: HotbarCellItem;
  index: number;
  children: (isDragging: boolean) => StrictReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: getItemId(item),
    data: { index },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        zIndex: defaultHotbarCells - index,
        position: "absolute" as const,
        opacity: isDragging ? 0 : 1,
        pointerEvents: isDragging ? "none" : "auto",
      }}
    >
      {children(isDragging)}
    </div>
  );
}

const NonInjectedHotbarMenu = observer((props: Dependencies & HotbarMenuProps) => {
  const { activeHotbar, entityRegistry, userPreferencesState, openCommandOverlay, className } = props;

  const [draggingOver, setDraggingOver] = useState(false);
  // The uid of the entity currently being dragged, and the index of the cell it
  // is hovering over. Together these replace react-beautiful-dnd's per-droppable
  // snapshot (`draggingOverWith` / `isDraggingOver`) that drives the CSS state.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [isHotbarVisible, setIsHotbarVisible] = useState(false);
  const isHotbarVisibleRef = useRef(false);
  // Mirrors `draggingOver` for the window `mousemove` listener below, which
  // closes over stale state. While a drag is in progress the auto-hide must be
  // suppressed so the hotbar stays put until the drop.
  const draggingOverRef = useRef(false);
  const hotbar = activeHotbar.get();

  // Preserve react-beautiful-dnd's ~5px drag threshold so a plain click on an
  // icon still opens the entity instead of starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
      } else if (event.clientX > hideThreshold && isHotbarVisibleRef.current && !draggingOverRef.current) {
        isHotbarVisibleRef.current = false;
        setIsHotbarVisible(false);
      }
      // Between triggerZone and hideThreshold, or while dragging, maintain current state
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

  const getEntity = (item: HotbarCellItem | null) => {
    if (!item || isHotbarFolderItem(item)) {
      return undefined;
    }

    return entityRegistry.getById(item.entity.uid);
  };
  const resetDragState = () => {
    setDraggingOver(false);
    draggingOverRef.current = false;
    setActiveId(null);
    setOverId(null);
  };
  const onDragStart = (event: DragStartEvent) => {
    setDraggingOver(true);
    draggingOverRef.current = true;
    setActiveId(String(event.active.id));
  };
  const onDragOver = (event: DragOverEvent) => {
    const { over } = event;

    setOverId(over ? Number(over.id) : null);
  };
  const onDragEnd = (event: DragEndEvent) => {
    resetDragState();

    const { active, over } = event;

    if (!over) {
      // Dropped outside of the list
      return;
    }

    const from = active.data.current?.index as number | undefined;
    const to = Number(over.id);

    if (from === undefined) {
      return;
    }

    hotbar?.restack(from, to);
  };
  const onDragCancel = () => {
    resetDragState();
  };
  const removeItem = (entityId: string) => {
    hotbar?.removeEntity(entityId);
  };
  const addItem = (entity: CatalogEntity) => {
    hotbar?.addEntity(entity);
  };
  const folders = hotbar?.getFolders() ?? [];
  const moveToFolder = (folderId: string, entity: CatalogEntity) => {
    hotbar?.addEntityToFolder(folderId, entity);
  };
  const newFolder = (index: number) => {
    openCommandOverlay(
      <HotbarNameCommand
        placeholder="Folder name"
        hint={folderNameHint}
        onSubmit={(name) => hotbar?.addFolder(name, index)}
      />,
    );
  };
  const renameFolder = (folder: HotbarFolder) => {
    openCommandOverlay(
      <HotbarNameCommand
        initialName={folder.name}
        placeholder="Folder name"
        hint={folderNameHint}
        onSubmit={(name) => hotbar?.renameFolder(folder.id, name)}
      />,
    );
  };
  // The name only applies to this hotbar, the entity keeps its own name.
  const renameEntity = (item: HotbarItem) => {
    openCommandOverlay(
      <HotbarNameCommand
        initialName={item.displayName}
        placeholder={item.entity.name}
        hint={`Please provide a name to show in the hotbar, or leave it empty to show "${item.entity.name}" (Press "Enter" to confirm or "Escape" to cancel)`}
        allowEmpty={true}
        onSubmit={(name) => hotbar?.setDisplayName(item.entity.uid, name)}
      />,
    );
  };
  const removeFolder = (folderId: string) => {
    hotbar?.removeFolder(folderId);
  };
  const getMoveAwayDirection = (entityId: string | undefined | null, cellIndex: number) => {
    if (!entityId || !hotbar) {
      return "animateDown";
    }

    const draggableItemIndex = hotbar.items.findIndex((item) => item && getItemId(item) == entityId);

    return draggableItemIndex > cellIndex ? "animateDown" : "animateUp";
  };

  const renderIcon = (item: HotbarCellItem, entity: CatalogEntity | undefined, index: number, isDragging: boolean) =>
    isHotbarFolderItem(item) ? (
      <HotbarFolderIcon
        key={index}
        folder={item.folder}
        className={cssNames({ isDragging })}
        onRename={renameFolder}
        onRemove={removeFolder}
        onRemoveEntity={removeItem}
        onRenameEntity={renameEntity}
        size={40}
      />
    ) : (
      renderEntityIcon(item, entity, index, isDragging)
    );

  const renderEntityIcon = (item: HotbarItem, entity: CatalogEntity | undefined, index: number, isDragging: boolean) =>
    entity ? (
      <HotbarEntityIcon
        key={index}
        index={index}
        entity={entity}
        onClick={() => entityRegistry.onRun(entity)}
        className={cssNames({ isDragging })}
        remove={removeItem}
        add={addItem}
        displayName={item.displayName}
        rename={() => renameEntity(item)}
        folders={folders}
        moveToFolder={moveToFolder}
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
    );

  const renderGrid = () =>
    hotbar?.items.map((item, index) => {
      const entity = getEntity(item);
      // react-beautiful-dnd exposed the dragged draggable id per droppable via
      // `snapshot.draggingOverWith`; reconstruct it from the hovered cell index.
      const draggingOverWith = overId === index ? activeId : null;

      return (
        <HotbarDroppableCell
          index={index}
          key={item ? getItemId(item) : `cell${index}`}
          className={cssNames(
            {
              isDraggingOver: overId === index,
              isDraggingOwner: draggingOverWith != null && draggingOverWith === entity?.getId(),
            },
            getMoveAwayDirection(draggingOverWith, index),
          )}
        >
          {item ? (
            <HotbarDraggableIcon item={item} index={index}>
              {(isDragging) => renderIcon(item, entity, index, isDragging)}
            </HotbarDraggableIcon>
          ) : (
            <HotbarEmptyCellMenu index={index} onNewFolder={newFolder} />
          )}
        </HotbarDroppableCell>
      );
    });

  // The entity being dragged, rendered inside `<DragOverlay>` so it follows the
  // cursor in a body-level portal and is never clipped by the hotbar's overflow.
  const activeItem = activeId != null ? hotbar?.items.find((item) => item && getItemId(item) === activeId) : undefined;
  const activeIndex = activeItem ? (hotbar?.items.indexOf(activeItem) ?? -1) : -1;
  const activeEntity = getEntity(activeItem ?? null);

  const handleMouseLeave = () => {
    if (userPreferencesState.hotbarAutoHide && isHotbarVisibleRef.current && !draggingOverRef.current) {
      isHotbarVisibleRef.current = false;
      setIsHotbarVisible(false);
    }
  };

  return (
    <div
      className={cssNames(
        "HotbarMenu flex flex-col",
        {
          draggingOver,
          autoHide: userPreferencesState.hotbarAutoHide,
          visible: isHotbarVisible,
        },
        className,
      )}
      onMouseLeave={handleMouseLeave}
    >
      <div className="HotbarItems flex flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          {renderGrid()}
          {/* Portal the overlay to <body>: when auto-hide is on, `.HotbarMenu`
              has a `transform`, which makes it the containing block for the
              `position: fixed` overlay and clips it to the hotbar's
              `overflow: hidden`. Rendering it at the body escapes that context. */}
          {createPortal(
            <DragOverlay>{activeItem ? renderIcon(activeItem, activeEntity, activeIndex, true) : null}</DragOverlay>,
            document.body,
          )}
        </DndContext>
      </div>
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
    openCommandOverlay: di.inject(commandOverlayInjectable).open,
  }),
});
