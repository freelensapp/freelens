/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { MigrationDeclaration } from "../../../features/persistent-storage/common/migrations.injectable";

export const favoritesStoreMigrationInjectionToken = getInjectionToken<MigrationDeclaration>({
  id: "favorites-store-migration-token",
});
