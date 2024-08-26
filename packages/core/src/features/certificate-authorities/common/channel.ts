/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getRequestChannel } from "@freelensapp/messaging";

export const casChannel = getRequestChannel<void, string[]>("certificate-authorities");
