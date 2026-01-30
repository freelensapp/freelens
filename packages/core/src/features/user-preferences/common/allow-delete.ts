/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { UserPreferencesState } from "./state.injectable";

export const allowDelete = (state: UserPreferencesState): boolean => state.allowDelete ?? true;
