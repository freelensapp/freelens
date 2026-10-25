/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { Credentials } from "./types";

export const credentialsInjectionToken = getInjectionToken<Credentials>({ id: "extension-credentials-api" });
