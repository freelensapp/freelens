/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { IComputedValue } from "mobx";
import type { ComponentType } from "react";

type JsonPrimitive = string | number | boolean | null;

export type DockTabParam = JsonPrimitive | DockTabParam[] | DockTabParams;

/** JSON data saved with the tab. Do not include credentials or log contents. */
export interface DockTabParams {
  [key: string]: DockTabParam;
}

type ReadonlyDockTabParam = JsonPrimitive | readonly ReadonlyDockTabParam[] | ReadonlyDockTabParams;

export interface ReadonlyDockTabParams {
  readonly [key: string]: ReadonlyDockTabParam;
}

export interface ExtensionDockTabProps {
  tabId: string;
  params: ReadonlyDockTabParams;
  close: () => void;
}

export interface DockTabRegistration {
  /** Stable identifier within this extension, also used when restoring tabs. */
  id: string;
  title: string;
  enabled?: IComputedValue<boolean>;
  components: {
    /** Mounted only while selected, expanded, and visible. Clean up work on unmount. */
    Tab: ComponentType<ExtensionDockTabProps>;
  };
}

export interface OpenDockTabOptions {
  title?: string;
  params?: DockTabParams;
}
