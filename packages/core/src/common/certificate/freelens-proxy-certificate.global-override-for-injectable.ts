/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import freelensProxyCertificateInjectable from "./freelens-proxy-certificate.injectable";

export default getGlobalOverride(freelensProxyCertificateInjectable, () => {
  return {
    get: () => ({
      public: "<public-data>",
      private: "<private-data>",
      cert: "<ca-data>",
    }),
    set: () => {},
  };
});
