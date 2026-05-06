/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../cluster-frame-context/for-namespaced-resources.injectable";
import namespaceStoreInjectable from "../store.injectable";
import isSelectionModifierKeyInjectable from "./is-selection-modifier-key.injectable";
import { namespaceSelectFilterModelFor } from "./namespace-select-filter-model";

const namespaceSelectFilterModelInjectable = getInjectable({
  id: "namespace-select-filter-model",

  instantiate: (di) =>
    namespaceSelectFilterModelFor({
      namespaceStore: di.inject(namespaceStoreInjectable),
      isSelectionModifierKey: di.inject(isSelectionModifierKeyInjectable),
      context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
    }),
});

export default namespaceSelectFilterModelInjectable;
