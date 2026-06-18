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
  params?: {
    [key: string]: string;
  };
}

export interface CreateHotbarData {
  id?: string;
  name: string;
  items?: readonly (HotbarItem | null)[];
}

export interface CreateHotbarOptions {
  setActive?: boolean;
}
