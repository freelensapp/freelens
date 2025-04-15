/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RequestChannel } from "@freelensapp/messaging";
import { getInitializable } from "../../../../../common/initializable-state/create";

export const updatingIsEnabledChannel: RequestChannel<void, boolean> = {
  id: "updating-is-enabled",
};

export const updatingIsEnabledInitializable = getInitializable<boolean>("updating-is-enabled");
