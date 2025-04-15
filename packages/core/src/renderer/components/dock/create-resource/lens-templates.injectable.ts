/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import parsePathInjectable from "../../../../common/path/parse.injectable";
import type { RawTemplates } from "./create-resource-templates.injectable";

const lensCreateResourceTemplatesInjectable = getInjectable({
  id: "lens-create-resource-templates",

  instantiate: (di): RawTemplates => {
    const parsePath = di.inject(parsePathInjectable);
    const templatesContext = require.context("@freelensapp/resource-templates/templates", true, /^\.\/.*\.(yaml|yml)$/);

    return {
      label: "lens",
      options: templatesContext.keys().map((key) => ({
        label: parsePath(key).name,
        value: templatesContext(key) as string,
      })),
    };
  },
  causesSideEffects: true,
});

export default lensCreateResourceTemplatesInjectable;
