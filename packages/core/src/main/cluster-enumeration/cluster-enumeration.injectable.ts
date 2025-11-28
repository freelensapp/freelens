/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import catalogEntityRegistryInjectable from "../catalog/entity-registry.injectable";
import { ClusterEnumeration } from "./cluster-enumeration";

/**
 * Injectable for the ClusterEnumeration service.
 *
 * This injectable provides a singleton instance of ClusterEnumeration
 * that is wired to the CatalogEntityRegistry.
 */
const clusterEnumerationInjectable = getInjectable({
  id: "cluster-enumeration",

  instantiate: (di) =>
    new ClusterEnumeration({
      catalogEntityRegistry: di.inject(catalogEntityRegistryInjectable),
    }),
});

export default clusterEnumerationInjectable;
