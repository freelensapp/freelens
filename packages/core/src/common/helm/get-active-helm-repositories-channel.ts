import { getRequestChannel } from "@freelensapp/messaging";
import type { AsyncResult } from "@freelensapp/utilities";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { HelmRepo } from "./helm-repo";

export const getActiveHelmRepositoriesChannel = getRequestChannel<void, AsyncResult<HelmRepo[]>>(
  "get-helm-active-list-repositories",
);
