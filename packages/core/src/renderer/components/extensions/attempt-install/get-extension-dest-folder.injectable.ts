/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import { getInjectable } from "@ogre-tools/injectable";
import { sanitizeExtensionName } from "../../../../extensions/lens-extension";
import extensionsRootInjectable from "../../../../features/extensions/installer/common/extensions-root.injectable";

/**
 * The directory holding every managed build of one extension, e.g.
 * `<userData>/extensions/freelensapp--helloworld`.
 */
export type GetExtensionDestFolder = (name: string) => string;

const getExtensionDestFolderInjectable = getInjectable({
  id: "get-extension-dest-folder",

  instantiate: (di): GetExtensionDestFolder => {
    const extensionsRoot = di.inject(extensionsRootInjectable);

    return (name) => path.join(extensionsRoot, sanitizeExtensionName(name));
  },
});

export default getExtensionDestFolderInjectable;
