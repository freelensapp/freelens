/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import hideDetailsInjectable from "./hide-details.injectable";
import kubeSelectedUrlParamInjectable from "./kube-selected-url.injectable";
import showDetailsInjectable from "./show-details.injectable";

export interface ToggleKubeDetailsPane {
  /**
   * @param selfLink The selfLink of the kube object to toggle the details panal of
   * @param resetSelected If true then the selected kube object (for the current list view) will be reset
   * @default resetSelected true
   */
  (selfLink: string, resetSelected?: boolean): void;
  /**
   * @deprecated Future versions will not support passing in `selfLink` that is `undefined`
   */
  (selfLink: string | undefined, resetSelected?: boolean): void;
}

const toggleKubeDetailsPaneInjectable = getInjectable({
  id: "toggle-kube-details-pane",
  instantiate: (di): ToggleKubeDetailsPane => {
    const showDetails = di.inject(showDetailsInjectable);
    const hideDetails = di.inject(hideDetailsInjectable);
    const kubeSelectedUrlParam = di.inject(kubeSelectedUrlParamInjectable);

    return (selfLink, resetSelected = true) => {
      const current = kubeSelectedUrlParam.get() === selfLink;

      if (current || !selfLink) {
        hideDetails();
      } else {
        showDetails(selfLink, resetSelected);
      }
    };
  },
});

export default toggleKubeDetailsPaneInjectable;
