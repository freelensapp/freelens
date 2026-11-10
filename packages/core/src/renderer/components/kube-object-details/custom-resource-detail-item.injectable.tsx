/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import customResourceDefinitionStoreInjectable from "../custom-resource-definitions/store.injectable";
import { CustomResourceDetails } from "../custom-resources/details";
import discoveredCustomResourcesInjectable from "../custom-resources/discovered-custom-resources.injectable";
import currentKubeObjectInDetailsInjectable from "./current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "./kube-object-detail-items/kube-object-detail-item-injection-token";

const customResourceDetailItemInjectable = getInjectable({
  id: "custom-resource-detail-item",
  instantiate: (di) => {
    const customResourceDefinitionStore = di.inject(customResourceDefinitionStoreInjectable);
    const discoveredCustomResources = di.inject(discoveredCustomResourcesInjectable);
    const currentKubeObjectInDetails = di.inject(currentKubeObjectInDetailsInjectable);
    const currentObject = computed(() => currentKubeObjectInDetails.value.get()?.object);
    const currentCustomResourceDefinition = computed(() => {
      const object = currentObject.get();

      if (!object) {
        return undefined;
      }

      return customResourceDefinitionStore.getByObject(object);
    });
    // Without its definition, an object of a custom resource known from
    // discovery gets the details that need none.
    const isDiscoveredCustomResource = computed(() => {
      const object = currentObject.get();

      return Boolean(
        object &&
          discoveredCustomResources
            .get()
            .some(({ group, version, kind }) => object.kind === kind && object.apiVersion === `${group}/${version}`),
      );
    });

    return {
      Component: ({ object }) => <CustomResourceDetails object={object} crd={currentCustomResourceDefinition.get()} />,
      enabled: computed(() => Boolean(currentCustomResourceDefinition.get()) || isDiscoveredCustomResource.get()),
      orderNumber: 100,
    };
  },
  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default customResourceDetailItemInjectable;
