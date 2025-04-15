/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeAnythingInjectionToken } from "@freelensapp/application-for-electron-main";
import { pipeline } from "@ogre-tools/fp";
import { getInjectable } from "@ogre-tools/injectable";
import { fromPairs, map } from "lodash/fp";
import type { AppPaths } from "../../common/app-paths/app-path-injection-token";
import { pathNames } from "../../common/app-paths/app-path-names";
import appPathsStateInjectable from "../../common/app-paths/app-paths-state.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import appNameInjectable from "../../common/vars/app-name.injectable";
import directoryForIntegrationTestingInjectable from "./directory-for-integration-testing/directory-for-integration-testing.injectable";
import getElectronAppPathInjectable from "./get-electron-app-path/get-electron-app-path.injectable";
import setElectronAppPathInjectable from "./set-electron-app-path/set-electron-app-path.injectable";

const setupAppPathsInjectable = getInjectable({
  id: "setup-app-paths",

  instantiate: (di) => ({
    run: () => {
      const setElectronAppPath = di.inject(setElectronAppPathInjectable);
      const appName = di.inject(appNameInjectable);
      const getElectronAppPath = di.inject(getElectronAppPathInjectable);
      const appPathsState = di.inject(appPathsStateInjectable);
      const directoryForIntegrationTesting = di.inject(directoryForIntegrationTestingInjectable);
      const joinPaths = di.inject(joinPathsInjectable);

      if (directoryForIntegrationTesting) {
        setElectronAppPath("appData", directoryForIntegrationTesting);
      }

      const appDataPath = getElectronAppPath("appData");

      setElectronAppPath("userData", joinPaths(appDataPath, appName));
      setElectronAppPath("sessionData", getElectronAppPath("userData"));

      const appPaths = pipeline(
        pathNames,
        map((name) => [name, getElectronAppPath(name)]),
        fromPairs,
      ) as AppPaths;

      appPathsState.set(appPaths);

      // NOTE: this is the worse of two evils. This makes sure that `RunnableSync` always is sync
      return undefined;
    },
  }),

  injectionToken: beforeAnythingInjectionToken,
});

export default setupAppPathsInjectable;
