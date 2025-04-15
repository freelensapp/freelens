import { getInjectable } from "@ogre-tools/injectable";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../cluster-frame-context/for-namespaced-resources.injectable";
import namespaceStoreInjectable from "../store.injectable";
import isMultiSelectionKeyInjectable from "./is-selection-key.injectable";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { namespaceSelectFilterModelFor } from "./namespace-select-filter-model";

const namespaceSelectFilterModelInjectable = getInjectable({
  id: "namespace-select-filter-model",

  instantiate: (di) =>
    namespaceSelectFilterModelFor({
      namespaceStore: di.inject(namespaceStoreInjectable),
      isMultiSelectionKey: di.inject(isMultiSelectionKeyInjectable),
      context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
    }),
});

export default namespaceSelectFilterModelInjectable;
