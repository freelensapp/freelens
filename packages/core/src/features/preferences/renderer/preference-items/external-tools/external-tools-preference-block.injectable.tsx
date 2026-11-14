/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";
import { ExternalTools } from "./external-tools";

import type { PreferenceBlock, PreferenceItemComponent } from "../preference-item-injection-token";

const ExternalToolsBlock: PreferenceItemComponent<PreferenceBlock> = () => <ExternalTools />;

const externalToolsPreferenceBlockInjectable = getInjectable({
  id: "external-tools-preference-block",

  instantiate: () => ({
    kind: "block" as const,
    id: "external-tools-preference-block",
    parentId: "external-tools-page",
    Component: ExternalToolsBlock,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default externalToolsPreferenceBlockInjectable;
