/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";

/**
 * The root of every managed extension install.
 *
 * It lives under the application data directory rather than in a home
 * dot-directory: the machinery around the extensions was already there, only
 * the payload was not.
 */
const extensionsRootInjectable = getInjectable({
  id: "extensions-root",
  instantiate: (di) => {
    const joinPaths = di.inject(joinPathsInjectable);
    const directoryForUserData = di.inject(directoryForUserDataInjectable);

    return joinPaths(directoryForUserData, "extensions");
  },
});

export default extensionsRootInjectable;
