/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RequestChannel } from "@freelensapp/messaging";
import { getInitializable } from "../../../../common/initializable-state/create";

export const buildVersionInitializable = getInitializable<string>("build-version");

export const buildVersionChannel: RequestChannel<void, string> = {
  id: "build-version",
};
