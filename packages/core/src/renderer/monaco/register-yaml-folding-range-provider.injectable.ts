/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { languages } from "monaco-editor";
import { getYamlFoldingRanges } from "./yaml-folding-ranges";

const registerYamlFoldingRangeProviderInjectable = getInjectable({
  id: "register-yaml-folding-range-provider",
  instantiate: () => () => {
    languages.registerFoldingRangeProvider("yaml", {
      provideFoldingRanges: (model) => getYamlFoldingRanges(model.getLinesContent()),
    });
  },
  causesSideEffects: true,
});

export default registerYamlFoldingRangeProviderInjectable;
