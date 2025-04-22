/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

const storeMigrationVersionInjectable = getInjectable({
  id: "store-migration-version",
  instantiate: () => "0.1.0",
});

export default storeMigrationVersionInjectable;
