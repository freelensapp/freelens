/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import readFileInjectable from "../../../common/fs/read-file.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import staticFilesDirectoryInjectable from "../../../common/vars/static-files-directory.injectable";
import { licenseContentChannel } from "../common/license-content-channel";

// The license manifest (static/build/license.txt) is a packaged application
// file. It must be read in the main process: reading it from the renderer is
// unreliable for packaged builds where it lives inside app.asar, which is what
// left the Licenses page empty (see issue #2240). The renderer requests the
// content over this channel instead.
const licenseContentRequestChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "license-content-request-channel-listener",
  channel: licenseContentChannel,
  getHandler: (di) => {
    const readFile = di.inject(readFileInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const staticFilesDirectory = di.inject(staticFilesDirectoryInjectable);

    return async () => {
      try {
        const licenseFilePath = joinPaths(staticFilesDirectory, "build/license.txt");

        return await readFile(licenseFilePath);
      } catch (error) {
        return `Error loading license file: ${error}`;
      }
    };
  },
});

export default licenseContentRequestChannelListenerInjectable;
