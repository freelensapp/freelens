/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { tuple } from "@freelensapp/utilities";
import { type IObservableArray, type IObservableValue, observable, runInAction, toJS } from "mobx";
import * as uuid from "uuid";
import { getShortName } from "../../../../common/catalog/helpers";
import { broadcastMessage } from "../../../../common/ipc";
import { hotbarTooManyItemsChannel } from "../../../../common/ipc/hotbar";
import { defaultHotbarCells, isHotbarFolderItem } from "./types";

import type { Logger } from "@freelensapp/logger";

import type { CatalogEntity } from "../../../../common/catalog";
import type { CreateHotbarData, HotbarCellItem, HotbarFolder, HotbarItem } from "./types";

export interface HotbarDependencies {
  readonly logger: Logger;
}

export interface HotbarData {
  readonly id: string;
  readonly name: string;
  readonly items: (HotbarCellItem | null)[];
}

export class Hotbar {
  readonly id: string;
  readonly name: IObservableValue<string>;
  readonly items: IObservableArray<HotbarCellItem | null>;

  constructor(
    private readonly dependencies: HotbarDependencies,
    data: CreateHotbarData,
  ) {
    this.id = data.id ?? uuid.v4();
    this.name = observable.box(data.name);
    this.items = observable.array(data.items ?? tuple.filled(defaultHotbarCells, null));
  }

  isFull() {
    for (const item of this.items) {
      if (!item) {
        return false;
      }
    }

    return true;
  }

  hasEntity(entityId: string) {
    return this.items.some((item) =>
      isHotbarFolderItem(item)
        ? item.folder.items.some((folderItem) => folderItem.entity.uid === entityId)
        : item?.entity.uid === entityId,
    );
  }

  getFolders(): HotbarFolder[] {
    const folders: HotbarFolder[] = [];

    for (const item of this.items) {
      if (isHotbarFolderItem(item)) {
        folders.push(item.folder);
      }
    }

    return folders;
  }

  getFolder(folderId: string): HotbarFolder | undefined {
    for (const item of this.items) {
      if (isHotbarFolderItem(item) && item.folder.id === folderId) {
        return item.folder;
      }
    }

    return undefined;
  }

  /**
   * Returns the item of the entity, either pinned to a cell or in a folder.
   */
  getItem(entityId: string): HotbarItem | undefined {
    for (const item of this.items) {
      if (isHotbarFolderItem(item)) {
        const folderItem = item.folder.items.find((folderItem) => folderItem.entity.uid === entityId);

        if (folderItem) {
          return folderItem;
        }
      } else if (item?.entity.uid === entityId) {
        return item;
      }
    }

    return undefined;
  }

  /**
   * Sets the name shown for the entity in this hotbar. An empty name removes
   * it, so the entity's own name is shown again.
   */
  setDisplayName(entityId: string, displayName: string) {
    runInAction(() => {
      const item = this.getItem(entityId);

      if (!item) {
        return;
      }

      const trimmed = displayName.trim();

      if (trimmed) {
        item.displayName = trimmed;
      } else {
        delete item.displayName;
      }
    });
  }

  private findEmptyCellIndex(cellIndex?: number) {
    if (cellIndex === undefined) {
      const emptyCellIndex = this.items.indexOf(null);

      if (emptyCellIndex < 0) {
        broadcastMessage(hotbarTooManyItemsChannel);
      }

      return emptyCellIndex;
    }

    if (0 <= cellIndex && cellIndex < this.items.length) {
      return cellIndex;
    }

    this.dependencies.logger.error("cannot pin entity to hotbar outside of index range", {
      hotbarId: this.id,
      cellIndex,
    });

    return -1;
  }

  private findClosestEmptyIndex(from: number, direction = 1) {
    let index = from;

    while (this.items[index] != null) {
      index += direction;
    }

    return index;
  }

  restack(from: number, to: number) {
    runInAction(() => {
      const source = this.items[from];
      const moveDown = from < to;

      if (from < 0 || to < 0 || from >= this.items.length || to >= this.items.length || isNaN(from) || isNaN(to)) {
        throw new Error("Invalid 'from' or 'to' arguments");
      }

      if (from == to) {
        return;
      }

      this.items.splice(from, 1, null);

      if (this.items[to] == null) {
        this.items.splice(to, 1, source);
      } else {
        // Move cells up or down to closes empty cell
        this.items.splice(this.findClosestEmptyIndex(to, moveDown ? -1 : 1), 1);
        this.items.splice(to, 0, source);
      }
    });
  }

  toggleEntity(item: CatalogEntity) {
    runInAction(() => {
      if (this.hasEntity(item.getId())) {
        this.removeEntity(item.getId());
      } else {
        this.addEntity(item);
      }
    });
  }

  removeEntity(uid: string) {
    runInAction(() => {
      const index = this.items.findIndex((item) => !isHotbarFolderItem(item) && item?.entity.uid === uid);

      if (index >= 0) {
        this.items[index] = null;

        return;
      }

      for (const item of this.items) {
        if (isHotbarFolderItem(item)) {
          const folderIndex = item.folder.items.findIndex((folderItem) => folderItem.entity.uid === uid);

          if (folderIndex >= 0) {
            item.folder.items.splice(folderIndex, 1);

            return;
          }
        }
      }
    });
  }

  addFolder(name: string, cellIndex?: number): string | undefined {
    const index = this.findEmptyCellIndex(cellIndex);

    if (index < 0) {
      return undefined;
    }

    const folder: HotbarFolder = { id: uuid.v4(), name, items: [] };

    runInAction(() => {
      this.items[index] = { folder };
    });

    return folder.id;
  }

  renameFolder(folderId: string, name: string) {
    runInAction(() => {
      const folder = this.getFolder(folderId);

      if (folder) {
        folder.name = name;
      }
    });
  }

  /**
   * Removes the folder and unpins the entities in it. The entities stay in the
   * catalog.
   */
  removeFolder(folderId: string) {
    runInAction(() => {
      const index = this.items.findIndex((item) => isHotbarFolderItem(item) && item.folder.id === folderId);

      if (index >= 0) {
        this.items[index] = null;
      }
    });
  }

  /**
   * Moves the entity into the folder. An entity that is already pinned to a
   * cell or to another folder of this hotbar is moved, not duplicated.
   */
  addEntityToFolder(folderId: string, item: CatalogEntity) {
    const newItem = toHotbarItem(item);

    runInAction(() => {
      const folder = this.getFolder(folderId);

      if (!folder) {
        return;
      }

      // Keep the display name when the entity is moved from another place.
      const displayName = this.getItem(newItem.entity.uid)?.displayName;

      if (displayName) {
        newItem.displayName = displayName;
      }

      this.removeEntity(newItem.entity.uid);
      folder.items.push(newItem);
    });
  }

  addEntity(item: CatalogEntity, cellIndex?: number) {
    const newItem = toHotbarItem(item);

    if (this.hasEntity(newItem.entity.uid)) {
      return;
    }

    const index = this.findEmptyCellIndex(cellIndex);

    if (index >= 0) {
      runInAction(() => {
        this.items[index] = newItem;
      });
    }
  }

  toJSON(): HotbarData {
    return {
      id: this.id,
      items: toJS(this.items),
      name: this.name.get(),
    };
  }
}

function toHotbarItem(item: CatalogEntity): HotbarItem {
  const uid = item.getId();
  const name = item.getName();
  const shortName = getShortName(item);

  if (typeof uid !== "string") {
    throw new TypeError("CatalogEntity's ID must be a string");
  }

  if (typeof name !== "string") {
    throw new TypeError("CatalogEntity's NAME must be a string");
  }

  if (typeof shortName !== "string") {
    throw new TypeError("CatalogEntity's SHORT_NAME must be a string");
  }

  const entity = {
    uid,
    name,
    source: item.metadata.source,
    shortName,
  };

  return { entity };
}
