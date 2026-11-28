/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import requestMarketplaceExtensionsInjectable from "./request-marketplace-extensions.injectable";

// The Installed tab of the Extensions page reads the marketplace too, so every test that opens the
// page would download the index.
export default getGlobalOverride(requestMarketplaceExtensionsInjectable, () => async () => []);
