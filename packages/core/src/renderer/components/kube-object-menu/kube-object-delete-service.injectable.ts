/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";

export type DeleteType = "normal" | "force" | "terminate";

export interface KubeObjectDeleteService {
  delete: (object: KubeObject, deleteType: DeleteType) => Promise<void>;
}

const kubeObjectDeleteServiceInjectable = getInjectable({
  id: "kube-object-delete-service",

  instantiate: (di): KubeObjectDeleteService => {
    const apiManager = di.inject(apiManagerInjectable);

    return {
      delete: async (object: KubeObject, deleteType: DeleteType) => {
        const store = apiManager.getStore(object.selfLink);

        if (!store) {
          throw new Error(`No store found for object: ${object.selfLink}`);
        }

        const resourceDescriptor = {
          name: object.getName(),
          namespace: object.getNs(),
        };

        switch (deleteType) {
          case "normal":
            await store.remove(object);
            break;

          case "force":
            // Use the generic KubeApi delete method with force options
            await store.api.delete({
              ...resourceDescriptor,
              deleteOptions: {
                gracePeriodSeconds: 0,
                propagationPolicy: "Background",
              },
            } as any);
            break;

          case "terminate":
            // For objects with finalizers in terminated state, try to patch finalizers first, then force delete
            try {
              await store.api.patch(resourceDescriptor, {
                metadata: {
                  finalizers: [],
                },
              });
            } catch (error) {
              console.warn("Failed to remove finalizers, proceeding with force delete", error);
            }

            await store.api.delete({
              ...resourceDescriptor,
              deleteOptions: {
                gracePeriodSeconds: 0,
                propagationPolicy: "Background",
              },
            } as any);
            break;

          default:
            throw new Error(`Unknown delete type: ${deleteType}`);
        }
      },
    };
  },
});

export default kubeObjectDeleteServiceInjectable;
