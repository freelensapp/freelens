/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { HelmRepo } from "./helm-repo";
import type { Result } from "@freelensapp/utilities";
import { getRequestChannel } from "@freelensapp/messaging";

export const addHelmRepositoryChannel = getRequestChannel<
  HelmRepo,
  Result<void, string>
>("add-helm-repository-channel");
