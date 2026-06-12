/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import electronAppInjectable from "../../electron-app/electron-app.injectable";

import type { PathName } from "../../../common/app-paths/app-path-names";

export type SetElectronAppPath = (name: PathName, path: string) => void;

const setElectronAppPathInjectable = getInjectable({
  id: "set-electron-app-path",

  instantiate: (di): SetElectronAppPath => {
    const electronApp = di.inject(electronAppInjectable);

    return (name, path) => electronApp.setPath(name, path);
  },
});

export default setElectronAppPathInjectable;
