/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface HotbarItem {
  entity: {
    uid: string;
    name: string;
    source?: string;
  };
  /**
   * A name shown for the entity in the hotbar instead of its own name. It only
   * lives in the hotbar, the entity itself is not renamed.
   */
  displayName?: string;
  params?: {
    [key: string]: string;
  };
}

export interface HotbarFolder {
  id: string;
  name: string;
  items: HotbarItem[];
}

/**
 * A single hotbar cell that groups several entities, so that one cell can hold
 * the clusters of a whole project.
 */
export interface HotbarFolderItem {
  folder: HotbarFolder;
}

export type HotbarCellItem = HotbarItem | HotbarFolderItem;

export const isHotbarFolderItem = (item: HotbarCellItem | null | undefined): item is HotbarFolderItem =>
  !!item && "folder" in item;

export interface CreateHotbarData {
  id?: string;
  name: string;
  items?: (HotbarCellItem | null)[];
}

export interface CreateHotbarOptions {
  setActive?: boolean;
}

export const defaultHotbarCells = 12; // Number is chosen to easy hit any item with keyboard
