/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiContextSourceInjectionToken } from "../context-source";
import { editorYamlForAi, resourceYamlForAi } from "../resource-yaml-for-ai";

const manifestAiContextSourceInjectable = getInjectable({
  id: "manifest-ai-context-source",
  instantiate: () => ({
    id: "manifest",
    label: "Resource manifest",
    description: "The object's YAML, without managed fields; Secret and credential-like values redacted.",
    orderNumber: 10,
    isAvailableFor: (target) => (target.type === "resource" && Boolean(target.manifest)) || target.type === "yaml",
    isEnabledByDefaultFor: () => true,
    collect: async (target) => {
      if (target.type === "yaml") {
        return { title: "Manifest (from the editor)", body: editorYamlForAi(target.yaml), language: "yaml" };
      }

      if (target.type === "resource" && target.manifest) {
        return {
          title: "Manifest",
          body: resourceYamlForAi(target.resource.kind, target.manifest),
          language: "yaml",
        };
      }

      return undefined;
    },
  }),
  injectionToken: aiContextSourceInjectionToken,
});

export default manifestAiContextSourceInjectable;
