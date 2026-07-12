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
    // Vite (v2): replaces webpack's require.context over
    // @freelensapp/resource-templates/templates with a build-time glob.
    const templates = import.meta.glob("../../../../../../resource-templates/templates/**/*.{yaml,yml}", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;

    return {
      label: "lens",
      options: Object.entries(templates).map(([key, value]) => ({
        label: parsePath(key).name,
        value,
      })),
    };
  },
  causesSideEffects: true,
});

export default lensCreateResourceTemplatesInjectable;
