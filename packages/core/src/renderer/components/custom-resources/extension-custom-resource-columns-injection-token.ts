/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { IComputedValue } from "mobx";

import type { CustomResourceColumn } from "./custom-resource-columns-registration";

/**
 * A `customResourceColumns` registration of an extension, as the host keeps
 * it once checked.
 */
export interface ExtensionCustomResourceColumns {
  extensionName: string;
  kind: string;
  apiVersions: string[];
  columns: Record<string, CustomResourceColumn>;
  /** Whether the extension that registered it is enabled for the cluster frame. */
  enabled: IComputedValue<boolean>;
}

export const extensionCustomResourceColumnsInjectionToken = getInjectionToken<ExtensionCustomResourceColumns>({
  id: "extension-custom-resource-columns-injection-token",
});
