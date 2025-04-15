/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import appNameInjectable from "../../common/vars/app-name.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";
import { buildVersionInitializationInjectable } from "../../features/vars/build-version/main/init.injectable";

const logVersionOnStartInjectable = getInjectable({
  id: "log-version-on-start",
  instantiate: (di) => ({
    run: () => {
      const logger = di.inject(loggerInjectionToken);
      const buildVersion = di.inject(buildVersionInitializable.stateToken);
      const appName = di.inject(appNameInjectable);

      logger.info(`Starting v${buildVersion} of ${appName}...`);
      logger.info(
        `Electron: ${process.versions.electron}, Chrome: ${process.versions.chrome}, Node: ${process.versions.node}, Platform: ${process.platform}, Architecture: ${process.arch}`,
      );
    },
    runAfter: buildVersionInitializationInjectable,
  }),
  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default logVersionOnStartInjectable;
