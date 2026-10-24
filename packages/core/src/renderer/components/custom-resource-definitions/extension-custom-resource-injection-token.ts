/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { IComputedValue } from "mobx";

/**
 * A custom resource an extension registered in its `customResources` field,
 * that is one it presents with pages of its own.
 */
export interface ExtensionCustomResource {
  group: string;
  plural: string;
  extensionName: string;
  /** Whether the extension that registered it is enabled for the cluster frame. */
  enabled: IComputedValue<boolean>;
}

export const extensionCustomResourceInjectionToken = getInjectionToken<ExtensionCustomResource>({
  id: "extension-custom-resource-injection-token",
});
