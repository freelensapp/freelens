/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import extensionLoaderInjectable from "../../extensions/extension-loader/extension-loader.injectable";
import warnOnExtensionRequireInjectable from "../../features/extensions/loader/renderer/warn-on-extension-require.injectable";

const loadExtensionsInjectable = getInjectable({
  id: "load-extensions",
  instantiate: (di) => {
    const extensionLoader = di.inject(extensionLoaderInjectable);
    const warnOnExtensionRequire = di.inject(warnOnExtensionRequireInjectable);

    return () => {
      warnOnExtensionRequire();

      return extensionLoader.autoInitExtensions();
    };
  },
});

export default loadExtensionsInjectable;
