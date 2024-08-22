/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { observableHistoryInjectionToken } from "@freelens/routing";
import navigateToFrontPageInjectable from "../../../../common/front-end-routing/navigate-to-front-page.injectable";

const closePreferencesInjectable = getInjectable({
  id: "close-preferences",

  instantiate: (di) => {
    const observableHistory = di.inject(observableHistoryInjectionToken);
    const navigateToFrontPage = di.inject(navigateToFrontPageInjectable);

    return () => {
      if (observableHistory.length <= 1) {
        navigateToFrontPage();
      } else {
        observableHistory.goBack();
      }
    };
  },
});

export default closePreferencesInjectable;
