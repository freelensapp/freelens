/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import isMacInjectable from "../../../../../../common/vars/is-mac.injectable";
import productNameInjectable from "../../../../../../common/vars/product-name.injectable";
import applicationMenuItemInjectionToken from "../../application-menu-item-injection-token";
import showAboutInjectable from "./show-about.injectable";

const aboutMenuItemInjectable = getInjectable({
  id: "about-menu-item",

  instantiate: (di) => {
    const productName = di.inject(productNameInjectable);
    const showAbout = di.inject(showAboutInjectable);
    const isMac = di.inject(isMacInjectable);

    return {
      kind: "clickable-menu-item" as const,
      id: "about",
      parentId: isMac ? "mac" : "help",
      orderNumber: isMac ? 10 : 40,
      label: `About ${productName}`,

      onClick() {
        showAbout();
      },
    };
  },

  injectionToken: applicationMenuItemInjectionToken,
});

export default aboutMenuItemInjectable;
