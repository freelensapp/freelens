/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";

import type { AuthorizationV1Api, V1ResourceAttributes } from "@kubernetes/client-node";

/**
 * Requests the permissions for actions on the kube cluster
 * @param resourceAttributes The descriptor of the action that is desired to be known if it is allowed
 * @returns `true` if the actions described are allowed
 */
export type CanI = (resourceAttributes: V1ResourceAttributes) => Promise<boolean>;

export interface AccessReviewOptions {
  /**
   * Whether the review is no longer wanted, as when its cluster was disconnected while it ran.
   * Its failure is then expected, and logged only at debug level.
   */
  isCanceled?: () => boolean;
}

export type CreateCanI = (api: AuthorizationV1Api, options?: AccessReviewOptions) => CanI;

const createCanIInjectable = getInjectable({
  id: "create-can-i",
  instantiate: (di): CreateCanI => {
    const logger = di.inject(loggerInjectionToken);

    return (api, { isCanceled } = {}) =>
      async (resourceAttributes: V1ResourceAttributes): Promise<boolean> => {
        try {
          const body = await api.createSelfSubjectAccessReview({
            body: {
              apiVersion: "authorization.k8s.io/v1",
              kind: "SelfSubjectAccessReview",
              spec: { resourceAttributes },
            },
          });

          return body.status?.allowed ?? false;
        } catch (error) {
          if (isCanceled?.()) {
            logger.debug(`[AUTHORIZATION-REVIEW]: canceled access review failed: ${error}`, { resourceAttributes });

            return false;
          }

          logger.error(`[AUTHORIZATION-REVIEW]: failed to create access review: ${error}`, { resourceAttributes });

          return false;
        }
      };
  },
});

export default createCanIInjectable;
