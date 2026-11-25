/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { defaultZoom, isZoomStep, toZoomFactor } from "../common/zoom-steps";

/**
 * The part of Electron's `WebContents` the zoom needs.
 */
export interface ZoomableWebContents {
  setZoomFactor(factor: number): void;
  on(event: "did-navigate", listener: () => void): unknown;
}

/**
 * Keeps the zoom of the web contents of a window at the zoom of the preferences: at once, after every navigation
 * of its main frame, and whenever the preference changes. The frames of the window, the cluster frames among them,
 * follow the zoom of its main frame. Returns the function that stops following the preference, for when the window closes.
 */
export type ManageZoomOfWebContents = (webContents: ZoomableWebContents) => () => void;

const manageZoomOfWebContentsInjectable = getInjectable({
  id: "manage-zoom-of-web-contents",

  instantiate: (di): ManageZoomOfWebContents => {
    const state = di.inject(userPreferencesStateInjectable);

    // Before the preferences are loaded, the field is still unset.
    const getZoomFactor = () => toZoomFactor(isZoomStep(state.zoom) ? state.zoom : defaultZoom);

    return (webContents) => {
      // Chromium keeps the zoom per origin, so a navigation can take it back to the one of another page.
      const applyZoom = () => webContents.setZoomFactor(getZoomFactor());

      webContents.on("did-navigate", applyZoom);

      return reaction(getZoomFactor, (factor) => webContents.setZoomFactor(factor), { fireImmediately: true });
    };
  },
});

export default manageZoomOfWebContentsInjectable;
