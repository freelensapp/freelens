/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { KubeObject } from "@freelensapp/kube-object";

export interface CustomColumnDialogAnchor {
  id: string;
  title: string;
}

export interface CustomColumnDialogParams {
  /**
   * The resource whose list the dialog was opened from.
   */
  kind: string;
  apiVersion: string;

  /**
   * The columns of that list, in the order they are shown, offered as the place to put a custom
   * column after.
   */
  anchors: CustomColumnDialogAnchor[];

  /**
   * The items of that list, read when the preview renders so it follows the list.
   */
  getPreviewItems: () => KubeObject[];
}

const customColumnDialogStateInjectable = getInjectable({
  id: "custom-column-dialog-state",
  // `deep: false` keeps the params by reference: they hold a callback over the list's items, and a
  // deep observable would walk every item of the list on every change.
  instantiate: () => observable.box<CustomColumnDialogParams | undefined>(undefined, { deep: false }),
});

export default customColumnDialogStateInjectable;
