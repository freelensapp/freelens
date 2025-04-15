/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import lensCreateResourceTemplatesInjectable from "./lens-templates.injectable";

export default getGlobalOverride(lensCreateResourceTemplatesInjectable, () => ({
  label: "lens",
  options: [],
}));
