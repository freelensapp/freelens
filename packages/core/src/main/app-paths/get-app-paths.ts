/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fromPairs } from "lodash/fp";
import type { AppPaths } from "../../common/app-paths/app-path-injection-token";
import type { PathName } from "../../common/app-paths/app-path-names";
import { pathNames } from "../../common/app-paths/app-path-names";

interface Dependencies {
  getAppPath: (name: PathName) => string;
}

export const getAppPaths = ({ getAppPath }: Dependencies) =>
  fromPairs(pathNames.map((name) => [name, getAppPath(name)])) as AppPaths;
