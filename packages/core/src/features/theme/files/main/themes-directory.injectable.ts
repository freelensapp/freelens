/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";

/**
 * `<userData>/themes`, where imported themes live, one file each. The main process owns it: the
 * renderer gets the themes over a channel.
 */
const themesDirectoryInjectable = getInjectable({
  id: "themes-directory",
  instantiate: (di) => di.inject(joinPathsInjectable)(di.inject(directoryForUserDataInjectable), "themes"),
});

export default themesDirectoryInjectable;
