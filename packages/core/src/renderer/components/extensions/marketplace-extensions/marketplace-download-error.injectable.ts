/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

/**
 * Why the last download of the marketplace failed, or `undefined` when it
 * succeeded.
 */
const marketplaceDownloadErrorInjectable = getInjectable({
  id: "marketplace-download-error",
  instantiate: () => observable.box<string | undefined>(undefined),
});

export default marketplaceDownloadErrorInjectable;
