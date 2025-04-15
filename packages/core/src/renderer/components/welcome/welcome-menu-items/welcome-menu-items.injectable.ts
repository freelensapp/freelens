/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import navigateToCatalogInjectable from "../../../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import rendererExtensionsInjectable from "../../../../extensions/renderer-extensions.injectable";
import { getWelcomeMenuItems } from "./get-welcome-menu-items";

const welcomeMenuItemsInjectable = getInjectable({
  id: "welcome-menu-items",

  instantiate: (di) =>
    getWelcomeMenuItems({
      extensions: di.inject(rendererExtensionsInjectable),
      navigateToCatalog: di.inject(navigateToCatalogInjectable),
    }),
});

export default welcomeMenuItemsInjectable;
