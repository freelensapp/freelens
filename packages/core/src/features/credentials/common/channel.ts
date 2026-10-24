/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { CredentialRequest, CredentialResponse } from "./types";

export const credentialsChannel = getRequestChannel<CredentialRequest, CredentialResponse>("extension-credentials");
