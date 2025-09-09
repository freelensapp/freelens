/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";

export type DeleteType = "delete" | "force_delete" | "force_finalize";

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

        switch (deleteType) {
          case "delete":
            await store.remove(object);
            break;

          case "force_delete":
            // Use the delete option with grace period 0s
            console.log("Force deleting with grace period 0s", object);
            await store.removeWithOptions(object, {
              gracePeriodSeconds: 0,
              propagationPolicy: "Background",
            });
            console.log("Deleted", object);
            break;

          case "force_finalize":
            // For objects with finalizers in terminated state, patch finalizers
            await store.patch(
              object,
              {
                metadata: {
                  finalizers: [],
                },
              },
              "merge",
            );
            break;

          default:
            throw new Error(`Unknown delete type: ${deleteType}`);
        }
      },
    };
  },
});

export default kubeObjectDeleteServiceInjectable;
