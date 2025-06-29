/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import tls from "tls";

const caCertificatesInjectable = getInjectable({
  id: "ca-certificates",
  instantiate: () => tls.getCACertificates("default").concat(tls.getCACertificates("system")),
});

export default caCertificatesInjectable;
