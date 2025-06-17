/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { SelfSignedCert } from "selfsigned";

export const lensProxyCertificateChannel = getRequestChannel<void, SelfSignedCert>("request-lens-proxy-certificate");
