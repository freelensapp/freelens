/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import fileSystemProvisionerStoreInjectable from "../../../extensions/extension-loader/file-system-provisioner-store/file-system-provisioner-store.injectable";

const initFileSystemProvisionerStoreInjectable = getInjectable({
  id: "init-file-system-provisioner-store",
  instantiate: (di) => ({
    run: () => {
      const store = di.inject(fileSystemProvisionerStoreInjectable);

      store.load();
    },
  }),
  injectionToken: onLoadOfApplicationInjectionToken,
});

export default initFileSystemProvisionerStoreInjectable;
