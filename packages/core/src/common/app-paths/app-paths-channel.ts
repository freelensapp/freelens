import { getRequestChannel } from "@freelensapp/messaging";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { AppPaths } from "./app-path-injection-token";

export const appPathsChannel = getRequestChannel<void, AppPaths>("app-paths");
